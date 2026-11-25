
"use client";

import LiveMatchChat from "@/components/live/LiveMatchChat";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
} from "@livekit/components-react";
import type { TrackReference } from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  X,
  Eye,
  Gift,
  Trophy,
  Crown,
  VideoOff,
  Loader2,
  Clock3,
  Users,
} from "lucide-react";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type Live = {
  id: string;
  host_id: string;
  opponent_id: string | null;
  title: string | null;
  status: string;
  viewer_count: number | null;
  team_a_score: number | null;
  team_b_score: number | null;
  match_status: string | null;
  match_started_at: string | null;
  match_ends_at: string | null;
  match_duration_seconds: number | null;
};

type Donor = {
  id: string;
  sender_id: string;
  total_price: number;
  profile?: Profile | null;
};

type TokenResponse = {
  token: string;
  roomName: string;
  livekitUrl: string;
  error?: string;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatTime(value: number) {
  const seconds = Math.max(0, value);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function MatchVideo({
  liveId,
  label,
}: {
  liveId: string;
  label: string;
}) {
  const [token, setToken] = useState<TokenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function connect() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          room: `live-${liveId}`,
          name: "Spectateur Match",
          viewer: "1",
        });

        const response = await fetch(
          `/api/livekit/token?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const data = (await response.json()) as TokenResponse;

        if (!response.ok) {
          throw new Error(data.error || "Flux indisponible.");
        }

        if (!data.token || !data.livekitUrl) {
          throw new Error("Réponse LiveKit incomplète.");
        }

        if (!controller.signal.aborted) {
          setToken(data);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        if (!controller.signal.aborted) {
          setError(
            err instanceof Error ? err.message : "Connexion impossible."
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void connect();

    return () => controller.abort();
  }, [liveId]);

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-950 px-3 text-center text-white">
        <VideoOff className="h-8 w-8 text-white/50" />
        <p className="text-xs font-semibold">{label}</p>
        <p className="text-[10px] text-white/50">
          {error || "Flux vidéo indisponible"}
        </p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      key={`${token.roomName}-${token.token}`}
      serverUrl={token.livekitUrl}
      token={token.token}
      connect
      video={false}
      audio={false}
      options={{
        adaptiveStream: true,
        dynacast: true,
      }}
      className="absolute inset-0 h-full w-full bg-black"
    >
      <MatchVideoTrack />
    </LiveKitRoom>
  );
}

function MatchVideoTrack() {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: true }
  );

  const camera = tracks.find(
    (item): item is TrackReference => item.publication !== undefined
  );

  if (!camera) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 text-white">
        <div className="text-center">
          <VideoOff className="mx-auto mb-2 h-8 w-8 text-white/40" />
          <p className="text-xs text-white/60">
            En attente de la caméra...
          </p>
        </div>
      </div>
    );
  }

  return (
    <VideoTrack
      trackRef={camera}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

export default function LiveMatchPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const id = String(params.id || "");

  const [live, setLive] = useState<Live | null>(null);
  const [host, setHost] = useState<Profile | null>(null);
  const [opponent, setOpponent] = useState<Profile | null>(null);
  const [opponentLiveId, setOpponentLiveId] = useState("");
  const [donors, setDonors] = useState<Donor[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [donorsLoading, setDonorsLoading] = useState(true);

  const loadDonors = useCallback(async () => {
    if (!id) return;

    setDonorsLoading(true);

    try {
      const { data, error } = await supabase
        .from("live_gifts")
        .select("id,sender_id,total_price")
        .eq("live_id", id)
        .order("created_at", { ascending: false })
        .limit(300);

      if (error) throw error;

      const totals = new Map<string, number>();

      (data || []).forEach((gift) => {
        totals.set(
          gift.sender_id,
          (totals.get(gift.sender_id) || 0) + Number(gift.total_price || 0)
        );
      });

      const ranked = [...totals.entries()]
        .map(([sender_id, total_price]) => ({
          id: sender_id,
          sender_id,
          total_price,
        }))
        .sort((a, b) => b.total_price - a.total_price)
        .slice(0, 3);

      if (!ranked.length) {
        setDonors([]);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url")
        .in(
          "id",
          ranked.map((donor) => donor.sender_id)
        );

      setDonors(
        ranked.map((donor) => ({
          ...donor,
          profile:
            (profiles || []).find(
              (profile) => profile.id === donor.sender_id
            ) || null,
        }))
      );
    } catch (error) {
      console.error("Chargement des donateurs :", error);
      setDonors([]);
    } finally {
      setDonorsLoading(false);
    }
  }, [id, supabase]);

  const loadLive = useCallback(async () => {
    if (!id) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("lives")
        .select(
          "id,host_id,opponent_id,title,status,viewer_count,team_a_score,team_b_score,match_status,match_started_at,match_ends_at,match_duration_seconds"
        )
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setLive(null);
        return;
      }

      setLive(data as Live);

      const userIds = [
        data.host_id,
        ...(data.opponent_id ? [data.opponent_id] : []),
      ];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      const profileList = (profiles || []) as Profile[];

      setHost(
        profileList.find((profile) => profile.id === data.host_id) || null
      );

      setOpponent(
        data.opponent_id
          ? profileList.find(
              (profile) => profile.id === data.opponent_id
            ) || null
          : null
      );

      if (data.opponent_id) {
        const { data: opponentLive } = await supabase
          .from("lives")
          .select("id")
          .eq("host_id", data.opponent_id)
          .eq("status", "live")
          .neq("id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        setOpponentLiveId(opponentLive?.id || "");
      } else {
        setOpponentLiveId("");
      }
    } catch (error) {
      console.error("Chargement du Match Live :", error);
      setLive(null);
    } finally {
      setLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => {
    void loadLive();
    void loadDonors();

    const channel = supabase
      .channel(`match-page-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "lives",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setLive((current) =>
            current
              ? { ...current, ...(payload.new as Partial<Live>) }
              : (payload.new as Live)
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_gifts",
          filter: `live_id=eq.${id}`,
        },
        () => void loadDonors()
      )
      .subscribe();

    const refresh = window.setInterval(() => {
      void loadLive();
      void loadDonors();
    }, 20000);

    return () => {
      window.clearInterval(refresh);
      void supabase.removeChannel(channel);
    };
  }, [id, supabase, loadLive, loadDonors]);

  useEffect(() => {
    if (!live?.match_ends_at || live.match_status !== "active") {
      setRemaining(0);
      return;
    }

    const update = () => {
      const end = new Date(live.match_ends_at!).getTime();
      setRemaining(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    };

    update();

    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [live?.match_ends_at, live?.match_status]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-black text-white">
        <Loader2 className="h-9 w-9 animate-spin" />
      </div>
    );
  }

  if (!live) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-black text-white">
        <p>Match Live introuvable.</p>
        <button
          onClick={() => router.push("/")}
          className="rounded-full bg-white/10 px-5 py-2 text-sm"
        >
          Retour
        </button>
      </div>
    );
  }

  const hostName =
    host?.full_name || host?.username || "Équipe A";

  const opponentName =
    opponent?.full_name || opponent?.username || "Équipe B";

  const scoreA = Number(live.team_a_score || 0);
  const scoreB = Number(live.team_b_score || 0);

  const total = scoreA + scoreB;
  const percentA = total > 0 ? (scoreA / total) * 100 : 50;

  const active = live.match_status === "active";

  const leader =
    scoreA > scoreB
      ? hostName
      : scoreB > scoreA
      ? opponentName
      : "Égalité";

  return (
    <main className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-black text-white">
      <div className="absolute inset-0 flex">
        <section className="relative w-1/2 overflow-hidden border-r border-white/20">
          <MatchVideo liveId={id} label={hostName} />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-12">
            <p className="truncate text-xs font-extrabold">{hostName}</p>
            <span className="mt-1 inline-flex rounded-full bg-pink-600 px-2 py-1 text-[9px] font-bold">
              ÉQUIPE A
            </span>
          </div>
        </section>

        <section className="relative w-1/2 overflow-hidden">
          {opponentLiveId ? (
            <MatchVideo liveId={opponentLiveId} label={opponentName} />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 px-3 text-center">
              <VideoOff className="mb-3 h-9 w-9 text-white/30" />
              <p className="text-xs font-bold">{opponentName}</p>
              <p className="mt-1 text-[10px] text-white/45">
                Flux de l'adversaire indisponible
              </p>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-12">
            <p className="truncate text-right text-xs font-extrabold">
              {opponentName}
            </p>
            <div className="mt-1 flex justify-end">
              <span className="rounded-full bg-blue-600 px-2 py-1 text-[9px] font-bold">
                ÉQUIPE B
              </span>
            </div>
          </div>
        </section>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-[43%] z-10 -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-full border-2 border-white/70 bg-black/80 px-3 py-2 text-xl font-black italic shadow-xl">
          VS
        </div>
      </div>

      <header className="relative z-20 p-3 pt-safe">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 font-black">
              M
            </div>
            <span className="text-lg font-black">moshi</span>
            <span className="rounded-full bg-purple-600 px-2.5 py-1 text-[10px] font-bold">
              <Trophy className="mr-1 inline h-3 w-3" />
              MATCH LIVE
            </span>
          </div>

          <button
            onClick={() => router.push("/")}
            aria-label="Quitter le Match Live"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 backdrop-blur"
          >
            <X size={19} />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Crown className="h-4 w-4 shrink-0 text-yellow-400" />
            <span className="truncate text-[10px] font-bold">
              Top donateurs
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs">
            <Eye size={14} />
            {formatNumber(Number(live.viewer_count || 0))}
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2">
          {donorsLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-white/60" />
          ) : donors.length ? (
            donors.map((donor, index) => {
              const name =
                donor.profile?.full_name ||
                donor.profile?.username ||
                "Donateur";

              return (
                <div
                  key={donor.id}
                  className="flex min-w-0 items-center gap-1.5 rounded-full border border-white/10 bg-black/50 py-1 pl-1 pr-2"
                >
                  <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-white/10">
                    {donor.profile?.avatar_url ? (
                      <Image
                        src={donor.profile.avatar_url}
                        alt={name}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[10px] font-bold">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="max-w-16 truncate text-[9px]">
                    {index + 1}. {name}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="text-[10px] text-white/50">
              Aucun cadeau pour le moment
            </p>
          )}
        </div>

        <div className="mt-4 overflow-hidden rounded-full border border-white/20 bg-black/60 shadow-lg">
          <div className="flex h-9 w-full">
            <div
              className="flex items-center justify-start gap-1 bg-gradient-to-r from-pink-600 to-red-500 px-3 transition-all"
              style={{ width: `${percentA}%` }}
            >
              <Gift size={13} />
              <span className="text-xs font-black">
                {formatNumber(scoreA)}
              </span>
            </div>

            <div
              className="flex flex-1 items-center justify-end gap-1 bg-gradient-to-r from-blue-500 to-cyan-500 px-3"
            >
              <span className="text-xs font-black">
                {formatNumber(scoreB)}
              </span>
              <Gift size={13} />
            </div>
          </div>
        </div>

        <div className="mt-2 flex justify-center">
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/70 px-4 py-1.5 text-xs font-black">
            <Clock3 size={14} className="text-yellow-300" />
            {active ? formatTime(remaining) : "Match non actif"}
          </div>
        </div>
      </header>

      <div className="flex-1" />

      <footer className="relative z-20 space-y-3 p-4 pb-safe">
        <div className="flex justify-center">
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/65 px-4 py-2 text-[11px] font-bold backdrop-blur">
            <Trophy size={14} className="text-yellow-400" />
            {leader === "Égalité"
              ? "Les équipes sont à égalité"
              : `${leader} mène le match`}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/65 p-3 backdrop-blur">
          <div className="min-w-0">
            <p className="text-xs font-bold">Match Live</p>
            <p className="mt-1 text-[10px] text-white/55">
              {active
                ? "Les cadeaux font évoluer les scores en direct."
                : live.match_status === "finished"
                ? "Ce duel est terminé."
                : "En attente du démarrage du duel."}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 text-[10px] text-white/60">
            <Users size={14} />
            {formatNumber(Number(live.viewer_count || 0))}
          </div>
        </div>
       <LiveMatchChat liveId={live.id} />
      </footer>
    </main>
  );
}

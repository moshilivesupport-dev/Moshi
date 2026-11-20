
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  Swords,
  Clock3,
  Trophy,
  Play,
  Square,
  Loader2,
  Users,
  Search,
  Radio,
  X,
  Check,
  RefreshCw,
  Zap,
} from "lucide-react";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type AcceptedGuest = {
  id: string;
  invitee_id: string;
  profile: Profile | null;
};

type Candidate = {
  id: string;
  host_id: string;
  title: string | null;
  viewer_count: number | null;
  profile: Profile | null;
};

type LiveMatch = {
  id: string;
  host_id: string;
  opponent_id: string | null;
  mode: string | null;
  team_a_score: number | null;
  team_b_score: number | null;
  match_status: "none" | "active" | "finished" | "cancelled";
  match_started_at: string | null;
  match_ends_at: string | null;
  match_duration_seconds: number;
};

type Props = {
  liveId: string;
  currentUserId: string | null;
  isHost: boolean;
};

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(
    safe % 60
  ).padStart(2, "0")}`;
}

export default function LiveMatchPanel({
  liveId,
  currentUserId,
  isHost,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const autoFinishStarted = useRef(false);

  const [live, setLive] = useState<LiveMatch | null>(null);
  const [guests, setGuests] = useState<AcceptedGuest[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedGuest, setSelectedGuest] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [duration, setDuration] = useState(300);
  const [remaining, setRemaining] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchingLives, setSearchingLives] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [sendingId, setSendingId] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [autoSearching, setAutoSearching] = useState(false);
  const [autoMessage, setAutoMessage] = useState("");

  const loadLive = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from("lives")
      .select(
        "id,host_id,opponent_id,mode,team_a_score,team_b_score,match_status,match_started_at,match_ends_at,match_duration_seconds"
      )
      .eq("id", liveId)
      .maybeSingle();

    if (queryError) {
      console.error("Chargement Match Live :", queryError);
      setError(queryError.message);
      setLoading(false);
      return;
    }

    if (data) setLive(data as LiveMatch);
    setLoading(false);
  }, [liveId, supabase]);

  const loadAcceptedGuests = useCallback(async () => {
    if (!currentUserId || !isHost) return;

    const { data, error: queryError } = await supabase
      .from("live_invitations")
      .select("id,invitee_id")
      .eq("live_id", liveId)
      .eq("inviter_id", currentUserId)
      .eq("status", "accepted");

    if (queryError) {
      console.error("Invités acceptés :", queryError);
      return;
    }

    const invitations = data || [];

    if (!invitations.length) {
      setGuests([]);
      setSelectedGuest("");
      return;
    }

    const ids = invitations.map((item) => item.invitee_id);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,username,full_name,avatar_url")
      .in("id", ids);

    const accepted = invitations.map((item) => ({
      ...item,
      profile:
        (profiles || []).find((profile) => profile.id === item.invitee_id) ||
        null,
    }));

    setGuests(accepted);

    setSelectedGuest((previous) =>
      accepted.some((guest) => guest.invitee_id === previous)
        ? previous
        : ""
    );
  }, [currentUserId, isHost, liveId, supabase]);

  const loadCandidates = useCallback(async () => {
    if (!currentUserId || !isHost) return;

    setSearchingLives(true);

    try {
      const { data, error: queryError } = await supabase
        .from("lives")
        .select("id,host_id,title,viewer_count")
        .eq("status", "live")
        .neq("host_id", currentUserId)
        .neq("id", liveId)
        .order("created_at", { ascending: false })
        .limit(40);

      if (queryError) throw queryError;

      const lives = data || [];

      if (!lives.length) {
        setCandidates([]);
        return;
      }

      const ids = [...new Set(lives.map((item) => item.host_id))];

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url")
        .in("id", ids);

      if (profileError) throw profileError;

      setCandidates(
        lives.map((item) => ({
          ...item,
          profile:
            (profiles || []).find((profile) => profile.id === item.host_id) ||
            null,
        }))
      );
    } catch (err) {
      console.error("Recherche de diffuseurs :", err);
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger les lives."
      );
    } finally {
      setSearchingLives(false);
    }
  }, [currentUserId, isHost, liveId, supabase]);

  useEffect(() => {
    void loadLive();
    void loadAcceptedGuests();

    const channel = supabase
      .channel(`live-match-${liveId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "lives",
          filter: `id=eq.${liveId}`,
        },
        (payload) => setLive(payload.new as LiveMatch)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_invitations",
          filter: `live_id=eq.${liveId}`,
        },
        () => {
          void loadAcceptedGuests();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [liveId, supabase, loadLive, loadAcceptedGuests]);

  useEffect(() => {
    if (!open || !isHost) return;

    void loadCandidates();
    void loadAcceptedGuests();

    const refresh = window.setInterval(() => {
      void loadCandidates();
      void loadAcceptedGuests();
    }, 12000);

    return () => window.clearInterval(refresh);
  }, [open, isHost, loadCandidates, loadAcceptedGuests]);

  useEffect(() => {
    if (!autoSearching || !currentUserId) return;

    let cancelled = false;

    const checkQueue = async () => {
      const { data, error: queryError } = await supabase
        .from("live_matchmaking_queue")
        .select("status,invitation_id")
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (cancelled || queryError || !data) return;

      if (data.status === "matched" && data.invitation_id) {
        setAutoSearching(false);
        setAutoMessage(
          "Un diffuseur a été trouvé ! Invitation envoyée. En attente de sa réponse."
        );
        void loadAcceptedGuests();
      } else if (data.status === "cancelled") {
        setAutoSearching(false);
        setAutoMessage("Recherche terminée.");
      }
    };

    void checkQueue();

    const interval = window.setInterval(checkQueue, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [autoSearching, currentUserId, supabase, loadAcceptedGuests]);

  useEffect(() => {
    if (
      !live ||
      live.match_status !== "active" ||
      !live.match_ends_at
    ) {
      setRemaining(0);
      return;
    }

    const update = () => {
      const end = new Date(live.match_ends_at!).getTime();
      setRemaining(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
    };

    update();
    const interval = window.setInterval(update, 1000);

    return () => window.clearInterval(interval);
  }, [live?.match_status, live?.match_ends_at]);

  const finishMatch = useCallback(
    async (automatic = false) => {
      if (processing || !isHost) return;

      setProcessing(true);
      setError("");

      try {
        const { error: rpcError } = await supabase.rpc(
          "finish_live_match",
          { p_live_id: liveId }
        );

        if (rpcError) throw rpcError;

        await loadLive();
      } catch (err) {
        console.error("Fin du Match Live :", err);
        setError(
          err instanceof Error
            ? err.message
            : "Impossible de terminer le duel."
        );

        if (automatic) autoFinishStarted.current = false;
      } finally {
        setProcessing(false);
      }
    },
    [isHost, liveId, loadLive, processing, supabase]
  );

  useEffect(() => {
    if (
      !isHost ||
      !live ||
      live.match_status !== "active" ||
      remaining > 0 ||
      processing ||
      autoFinishStarted.current
    ) {
      return;
    }

    autoFinishStarted.current = true;
    void finishMatch(true);
  }, [isHost, live, remaining, processing, finishMatch]);

  const sendMatchInvitation = async (candidate: Candidate) => {
    if (!currentUserId || sendingId) return;

    setSendingId(candidate.host_id);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/live/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          live_id: liveId,
          invitee_id: candidate.host_id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Invitation impossible.");
      }

      setNotice(
        `Invitation Match envoyée à ${
          candidate.profile?.full_name ||
          candidate.profile?.username ||
          "ce diffuseur"
        }.`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur d'invitation."
      );
    } finally {
      setSendingId("");
    }
  };

  const startAutomaticSearch = async () => {
    if (processing || !currentUserId) return;

    setProcessing(true);
    setError("");
    setAutoMessage("");

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "join_live_matchmaking",
        { p_live_id: liveId }
      );

      if (rpcError) throw rpcError;

      if (data?.status === "matched") {
        setAutoSearching(false);
        setAutoMessage(
          "Un diffuseur a été trouvé ! Invitation envoyée. En attente de sa réponse."
        );
      } else {
        setAutoSearching(true);
        setAutoMessage(
          "Recherche en cours… Moshi cherche un autre diffuseur disponible."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de lancer la recherche automatique."
      );
    } finally {
      setProcessing(false);
    }
  };

  const stopAutomaticSearch = async () => {
    setProcessing(true);

    try {
      const { error: rpcError } = await supabase.rpc(
        "leave_live_matchmaking"
      );

      if (rpcError) throw rpcError;

      setAutoSearching(false);
      setAutoMessage("Recherche annulée.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Annulation impossible."
      );
    } finally {
      setProcessing(false);
    }
  };

  const startMatch = async () => {
    if (!selectedGuest || processing) return;

    setProcessing(true);
    setError("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "start_live_match",
        {
          p_live_id: liveId,
          p_opponent_id: selectedGuest,
          p_duration_seconds: duration,
        }
      );

      if (rpcError) throw rpcError;

      autoFinishStarted.current = false;
      await loadLive();
      setOpen(false);
    } catch (err) {
      console.error("Démarrage Match Live :", err);
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de démarrer le Match Live."
      );
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !live) {
    if (loading) return null;

    return (
      <div className="pointer-events-auto fixed bottom-24 left-3 right-3 z-40 mx-auto max-w-md rounded-xl bg-black/80 p-3 text-xs text-red-300">
        {error || "Impossible de charger le Match Live."}
      </div>
    );
  }

  const active = live.match_status === "active";
  const opponent = guests.find(
    (guest) => guest.invitee_id === live.opponent_id
  );

  const opponentName =
    opponent?.profile?.full_name ||
    opponent?.profile?.username ||
    "Adversaire";

  const hostScore = Number(live.team_a_score || 0);
  const opponentScore = Number(live.team_b_score || 0);

  const winner =
    hostScore > opponentScore
      ? "Équipe A"
      : opponentScore > hostScore
      ? opponentName
      : "Égalité";

  const filteredCandidates = candidates.filter((candidate) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;

    return (
      (candidate.profile?.full_name || "").toLowerCase().includes(term) ||
      (candidate.profile?.username || "").toLowerCase().includes(term) ||
      (candidate.title || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="pointer-events-auto fixed bottom-24 left-3 right-3 z-40 mx-auto max-w-md">
      {active ? (
        <div className="rounded-2xl border border-pink-400/30 bg-black/85 p-3 text-white shadow-2xl backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="text-pink-400" size={19} />
              <span className="text-xs font-extrabold uppercase tracking-wider">
                Match Live
              </span>
            </div>

            <div className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-1 text-xs font-bold text-red-300">
              <Clock3 size={13} />
              {formatTime(remaining)}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="text-center">
              <p className="truncate text-xs font-bold">Équipe A</p>
              <p className="text-2xl font-black text-pink-400">
                {hostScore.toLocaleString("fr-FR")}
              </p>
            </div>

            <span className="text-xs font-black text-white/40">VS</span>

            <div className="text-center">
              <p className="truncate text-xs font-bold">{opponentName}</p>
              <p className="text-2xl font-black text-purple-400">
                {opponentScore.toLocaleString("fr-FR")}
              </p>
            </div>
          </div>

          {remaining === 0 && (
            <p className="mt-2 text-center text-[11px] font-semibold text-yellow-300">
              Temps écoulé — fin du duel en cours
            </p>
          )}

          {error && (
            <p className="mt-2 rounded-lg bg-red-500/10 p-2 text-xs text-red-300">
              {error}
            </p>
          )}

          {isHost && (
            <button
              type="button"
              onClick={() => void finishMatch(false)}
              disabled={processing}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2 text-xs font-bold disabled:opacity-50"
            >
              {processing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Square size={13} />
              )}
              Terminer maintenant
            </button>
          )}
        </div>
      ) : (
        isHost && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setOpen((value) => !value);
                setError("");
                setNotice("");
              }}
              className="flex items-center gap-2 rounded-full border border-white/20 bg-black/75 px-4 py-2.5 text-xs font-extrabold text-white shadow-xl backdrop-blur-xl"
            >
              <Swords size={17} className="text-pink-400" />
              Match Live
            </button>
          </div>
        )
      )}

      {open && isHost && !active && (
        <div className="mb-2 max-h-[68dvh] overflow-y-auto rounded-2xl border border-white/10 bg-[#160D25] p-4 text-white shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold">Trouver un adversaire</h3>
              <p className="mt-1 text-[11px] text-white/45">
                Choisis un live ou laisse Moshi chercher.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              autoSearching
                ? void stopAutomaticSearch()
                : void startAutomaticSearch()
            }
            disabled={processing}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 py-3 text-sm font-extrabold disabled:opacity-50"
          >
            {processing ? (
              <Loader2 size={17} className="animate-spin" />
            ) : autoSearching ? (
              <Square size={16} />
            ) : (
              <Zap size={17} />
            )}
            {autoSearching
              ? "Annuler la recherche automatique"
              : "Recherche automatique"}
          </button>

          {autoMessage && (
            <p className="mb-3 rounded-xl bg-purple-500/10 p-3 text-xs text-purple-200">
              {autoMessage}
            </p>
          )}

          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white/75">
              <Radio size={15} className="text-red-400" />
              Diffuseurs en direct
            </div>

            <button
              type="button"
              onClick={() => void loadCandidates()}
              disabled={searchingLives}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/60"
              aria-label="Actualiser"
            >
              <RefreshCw
                size={15}
                className={searchingLives ? "animate-spin" : ""}
              />
            </button>
          </div>

          <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3">
            <Search size={16} className="text-white/40" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un diffuseur..."
              className="h-10 min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/35"
            />
          </div>

          <div className="mb-4 space-y-2">
            {searchingLives ? (
              <div className="flex justify-center py-5">
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : filteredCandidates.length === 0 ? (
              <p className="py-4 text-center text-xs text-white/45">
                Aucun autre diffuseur en direct pour le moment.
              </p>
            ) : (
              filteredCandidates.map((candidate) => {
                const profile = candidate.profile;
                const name =
                  profile?.full_name ||
                  profile?.username ||
                  "Utilisateur Moshi";

                const selected = selectedCandidate === candidate.host_id;

                return (
                  <div
                    key={candidate.id}
                    className={`flex items-center gap-3 rounded-xl border p-2.5 ${
                      selected
                        ? "border-pink-400/50 bg-pink-500/10"
                        : "border-white/5 bg-white/[0.04]"
                    }`}
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/10">
                      {profile?.avatar_url ? (
                        <Image
                          src={profile.avatar_url}
                          alt={name}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm font-bold">
                          {name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-[#160D25] bg-red-500" />
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedCandidate(candidate.host_id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-xs font-bold">{name}</p>
                      <p className="truncate text-[10px] text-white/45">
                        {candidate.title || "En direct"} ·{" "}
                        {Number(candidate.viewer_count || 0)} spectateur(s)
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => void sendMatchInvitation(candidate)}
                      disabled={!!sendingId}
                      className="flex shrink-0 items-center gap-1 rounded-full bg-pink-600 px-3 py-2 text-[10px] font-bold disabled:opacity-50"
                    >
                      {sendingId === candidate.host_id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Users size={13} />
                      )}
                      Inviter
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {notice && (
            <p className="mb-3 flex items-center gap-2 rounded-xl bg-green-500/10 p-3 text-xs text-green-300">
              <Check size={15} />
              {notice}
            </p>
          )}

          <div className="mb-2 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold text-white/70">
              <Users size={14} />
              Invités ayant accepté
            </label>
            <span className="text-[10px] text-white/40">
              {guests.length} disponible(s)
            </span>
          </div>

          <select
            value={selectedGuest}
            onChange={(event) => setSelectedGuest(event.target.value)}
            className="mb-3 w-full rounded-xl border border-white/10 bg-white/10 p-3 text-sm text-white outline-none"
          >
            <option value="" className="bg-[#160D25]">
              Choisir un adversaire accepté
            </option>
            {guests.map((guest) => (
              <option
                key={guest.id}
                value={guest.invitee_id}
                className="bg-[#160D25]"
              >
                {guest.profile?.full_name ||
                  guest.profile?.username ||
                  "Utilisateur"}
              </option>
            ))}
          </select>

          <label className="mb-2 flex items-center gap-2 text-xs text-white/65">
            <Clock3 size={14} />
            Durée du duel
          </label>

          <div className="mb-3 grid grid-cols-3 gap-2">
            {[180, 300, 600].map((seconds) => (
              <button
                key={seconds}
                type="button"
                onClick={() => setDuration(seconds)}
                className={`rounded-xl py-2 text-xs font-bold ${
                  duration === seconds
                    ? "bg-pink-600 text-white"
                    : "bg-white/10 text-white/65"
                }`}
              >
                {seconds / 60} min
              </button>
            ))}
          </div>

          {error && (
            <p className="mb-3 rounded-xl bg-red-500/10 p-3 text-xs text-red-300">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => void startMatch()}
            disabled={!selectedGuest || processing}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 py-3 text-sm font-extrabold disabled:opacity-40"
          >
            {processing ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Play size={17} />
            )}
            Lancer le Match Live
          </button>
        </div>
      )}

      {live.match_status === "finished" && (
        <div className="rounded-xl bg-black/85 p-3 text-white shadow-xl backdrop-blur">
          <div className="mb-2 flex items-center justify-center gap-2 text-xs font-bold">
            <Trophy size={16} className="text-yellow-400" />
            Match Live terminé
          </div>

          <div className="grid grid-cols-3 items-center text-center">
            <div>
              <p className="text-[10px] text-white/60">Équipe A</p>
              <p className="text-lg font-black text-pink-400">{hostScore}</p>
            </div>
            <div className="text-[10px] font-bold text-white/50">VS</div>
            <div>
              <p className="truncate text-[10px] text-white/60">
                {opponentName}
              </p>
              <p className="text-lg font-black text-purple-400">
                {opponentScore}
              </p>
            </div>
          </div>

          <p className="mt-2 text-center text-xs font-bold text-yellow-300">
            {winner === "Égalité"
              ? "Match nul"
              : `Vainqueur : ${winner}`}
          </p>
        </div>
      )}
    </div>
  );
}


"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Swords,
  Clock3,
  Trophy,
  Play,
  Square,
  Loader2,
  Users,
} from "lucide-react";

type AcceptedGuest = {
  id: string;
  invitee_id: string;
  profile?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
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
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

export default function LiveMatchPanel({
  liveId,
  currentUserId,
  isHost,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [live, setLive] = useState<LiveMatch | null>(null);
  const [guests, setGuests] = useState<AcceptedGuest[]>([]);
  const [selectedGuest, setSelectedGuest] = useState("");
  const [duration, setDuration] = useState(300);
  const [remaining, setRemaining] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const loadLive = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from("lives")
      .select(
        "id,host_id,opponent_id,mode,team_a_score,team_b_score,match_status,match_started_at,match_ends_at,match_duration_seconds"
      )
      .eq("id", liveId)
      .maybeSingle();

    if (queryError) {
      console.error("Chargement Match Live:", queryError);
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
      console.error("Invités acceptés:", queryError);
      return;
    }

    const invitations = data || [];

    if (!invitations.length) {
      setGuests([]);
      return;
    }

    const userIds = invitations.map((item) => item.invitee_id);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,username,full_name,avatar_url")
      .in("id", userIds);

    setGuests(
      invitations.map((item) => ({
        ...item,
        profile:
          profiles?.find((profile) => profile.id === item.invitee_id) || null,
      }))
    );
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
        (payload) => {
          setLive(payload.new as LiveMatch);
        }
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
    if (!live || live.match_status !== "active" || !live.match_ends_at) {
      setRemaining(0);
      return;
    }

    const update = () => {
      const end = new Date(live.match_ends_at!).getTime();
      const seconds = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setRemaining(seconds);
    };

    update();
    const interval = window.setInterval(update, 1000);

    return () => window.clearInterval(interval);
  }, [live?.match_status, live?.match_ends_at]);

  const startMatch = async () => {
    if (!selectedGuest || processing) return;

    setProcessing(true);
    setError("");

    try {
      const { error: rpcError } = await supabase.rpc("start_live_match", {
        p_live_id: liveId,
        p_opponent_id: selectedGuest,
        p_duration_seconds: duration,
      });

      if (rpcError) throw rpcError;

      await loadLive();
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de démarrer le Match Live."
      );
    } finally {
      setProcessing(false);
    }
  };

  const finishMatch = async () => {
    if (processing) return;

    setProcessing(true);
    setError("");

    try {
      const { error: rpcError } = await supabase.rpc("finish_live_match", {
        p_live_id: liveId,
      });

      if (rpcError) throw rpcError;

      await loadLive();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de terminer le duel."
      );
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !live) return null;

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

  return (
    <div className="pointer-events-auto fixed left-3 right-3 top-[76px] z-40 mx-auto max-w-md">
      {active ? (
        <div className="rounded-2xl border border-pink-400/30 bg-black/80 p-3 text-white shadow-2xl backdrop-blur-xl">
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

          {remaining === 0 && isHost && (
            <button
              type="button"
              onClick={() => void finishMatch()}
              disabled={processing}
              className="mt-3 w-full rounded-xl bg-pink-600 py-2 text-xs font-bold disabled:opacity-50"
            >
              Terminer le duel
            </button>
          )}

          {isHost && remaining > 0 && (
            <button
              type="button"
              onClick={() => void finishMatch()}
              disabled={processing}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2 text-xs font-bold disabled:opacity-50"
            >
              <Square size={13} />
              Terminer maintenant
            </button>
          )}
        </div>
      ) : (
        isHost && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="flex items-center gap-2 rounded-full border border-white/20 bg-black/65 px-4 py-2.5 text-xs font-extrabold text-white shadow-xl backdrop-blur-xl"
            >
              <Swords size={17} className="text-pink-400" />
              Match Live
            </button>
          </div>
        )
      )}

      {open && isHost && !active && (
        <div className="mt-2 rounded-2xl border border-white/10 bg-[#160D25] p-4 text-white shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-extrabold">Démarrer un duel</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-white/60"
            >
              Fermer
            </button>
          </div>

          <label className="mb-2 flex items-center gap-2 text-xs text-white/65">
            <Users size={14} />
            Invité ayant accepté
          </label>

          <select
            value={selectedGuest}
            onChange={(event) => setSelectedGuest(event.target.value)}
            className="mb-3 w-full rounded-xl border border-white/10 bg-white/10 p-3 text-sm text-white outline-none"
          >
            <option value="" className="bg-[#160D25]">
              Choisir un adversaire
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

          {guests.length === 0 && (
            <p className="mb-3 rounded-xl bg-yellow-500/10 p-3 text-xs text-yellow-200">
              Invite d’abord un utilisateur et attends qu’il accepte.
            </p>
          )}

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
        <div className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-black/70 p-2 text-xs font-bold text-white backdrop-blur">
          <Trophy size={15} className="text-yellow-400" />
          Dernier Match terminé
        </div>
      )}
    </div>
  );
}

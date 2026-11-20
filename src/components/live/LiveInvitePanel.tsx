
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  X,
  Search,
  UserPlus,
  Video,
  Check,
  Loader2,
  Radio,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface LiveInvitePanelProps {
  liveId: string;
  currentUserId: string | null;
  isHost: boolean;
}

interface LiveProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface LiveCandidate {
  id: string;
  host_id: string;
  title: string | null;
  viewer_count: number | null;
  created_at: string;
  profile: LiveProfile | null;
}

export default function LiveInvitePanel({
  liveId,
  currentUserId,
  isHost,
}: LiveInvitePanelProps) {
  const supabase = useMemo(() => createClient(), []);

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<LiveCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingId, setSendingId] = useState("");
  const [sentIds, setSentIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadLiveCandidates = useCallback(async (silent = false) => {
    if (!currentUserId || !isHost) return;

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const { data: lives, error: livesError } = await supabase
        .from("lives")
        .select("id,host_id,title,viewer_count,created_at")
        .eq("status", "live")
        .neq("host_id", currentUserId)
        .neq("id", liveId)
        .order("created_at", { ascending: false })
        .limit(40);

      if (livesError) throw livesError;

      const activeLives = lives || [];

      if (activeLives.length === 0) {
        setCandidates([]);
        return;
      }

      const hostIds = [
        ...new Set(activeLives.map((item) => item.host_id)),
      ];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url")
        .in("id", hostIds);

      if (profilesError) throw profilesError;

      const profileList = (profiles || []) as LiveProfile[];

      const formatted: LiveCandidate[] = activeLives.map((item) => ({
        ...item,
        profile:
          profileList.find((profile) => profile.id === item.host_id) || null,
      }));

      setCandidates(formatted);
    } catch (err) {
      console.error("Chargement des lives disponibles :", err);
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger les lives disponibles."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId, isHost, liveId, supabase]);

  useEffect(() => {
    const openHandler = () => {
      if (!isHost) return;

      setError("");
      setSuccess("");
      setSearch("");
      setIsOpen(true);
    };

    window.addEventListener("moshi-open-invite", openHandler);

    return () => {
      window.removeEventListener("moshi-open-invite", openHandler);
    };
  }, [isHost]);

  useEffect(() => {
    if (!isOpen) return;

    void loadLiveCandidates();

    const channel = supabase
      .channel(`invite-live-candidates-${liveId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lives",
        },
        () => {
          void loadLiveCandidates(true);
        }
      )
      .subscribe();

    const refreshInterval = window.setInterval(() => {
      void loadLiveCandidates(true);
    }, 15000);

    return () => {
      window.clearInterval(refreshInterval);
      void supabase.removeChannel(channel);
    };
  }, [isOpen, liveId, loadLiveCandidates, supabase]);

  const sendInvitation = async (candidate: LiveCandidate) => {
    if (
      !currentUserId ||
      sendingId ||
      sentIds.includes(candidate.host_id)
    ) {
      return;
    }

    setSendingId(candidate.host_id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/live/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          live_id: liveId,
          invitee_id: candidate.host_id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Impossible d'envoyer l'invitation."
        );
      }

      setSentIds((previous) => [
        ...previous,
        candidate.host_id,
      ]);

      const name =
        candidate.profile?.full_name ||
        candidate.profile?.username ||
        "ce diffuseur";

      setSuccess(`Invitation envoyée à ${name}.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de l'envoi de l'invitation."
      );
    } finally {
      setSendingId("");
    }
  };

  const filteredCandidates = candidates.filter((candidate) => {
    const term = search.trim().toLowerCase();

    if (!term) return true;

    const name = candidate.profile?.full_name || "";
    const username = candidate.profile?.username || "";
    const title = candidate.title || "";

    return (
      name.toLowerCase().includes(term) ||
      username.toLowerCase().includes(term) ||
      title.toLowerCase().includes(term)
    );
  });

  if (!currentUserId || !isHost) return null;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[160] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="max-h-[82dvh] w-full max-w-lg overflow-hidden rounded-t-[28px] border border-white/10 bg-[#160D25] sm:rounded-[28px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <Video size={19} className="text-pink-400" />
                  <h2 className="text-lg font-extrabold text-white">
                    Inviter sur mon live
                  </h2>
                </div>
                <p className="mt-1 text-xs text-white/50">
                  Choisis un diffuseur actuellement en direct
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
                aria-label="Fermer"
              >
                <X size={19} />
              </button>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3">
                <Search size={18} className="text-white/40" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher un diffuseur..."
                  className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                />
                <button
                  type="button"
                  onClick={() => void loadLiveCandidates(true)}
                  disabled={refreshing}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:bg-white/10"
                  aria-label="Actualiser les lives"
                >
                  <RefreshCw
                    size={16}
                    className={refreshing ? "animate-spin" : ""}
                  />
                </button>
              </div>

              {error && (
                <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs text-red-300">
                  {error}
                </p>
              )}

              {success && (
                <p className="mt-3 flex items-center gap-2 rounded-xl bg-green-500/10 p-3 text-xs text-green-300">
                  <Check size={16} />
                  {success}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white/70">
                  <Radio size={15} className="text-red-400" />
                  Lives en cours
                </div>
                <span className="text-[11px] text-white/40">
                  {candidates.length} disponible(s)
                </span>
              </div>

              <div className="mt-3 max-h-[48dvh] space-y-2 overflow-y-auto">
                {loading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-white" />
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="py-10 text-center">
                    <Video
                      size={30}
                      className="mx-auto mb-3 text-white/25"
                    />
                    <p className="text-sm font-semibold text-white/70">
                      {search.trim()
                        ? "Aucun live correspondant."
                        : "Aucun autre diffuseur en direct."}
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      Les nouveaux lives apparaîtront automatiquement ici.
                    </p>
                  </div>
                ) : (
                  filteredCandidates.map((candidate) => {
                    const profile = candidate.profile;
                    const name =
                      profile?.full_name ||
                      profile?.username ||
                      "Utilisateur Moshi";

                    const sent = sentIds.includes(candidate.host_id);

                    return (
                      <div
                        key={candidate.id}
                        className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.05] p-3"
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/10">
                          {profile?.avatar_url ? (
                            <Image
                              src={profile.avatar_url}
                              alt={name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center font-bold text-white">
                              {name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#160D25] bg-red-500" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-white">
                            {name}
                          </p>
                          {profile?.username && (
                            <p className="truncate text-xs text-white/45">
                              @{profile.username}
                            </p>
                          )}
                          <p className="mt-1 flex items-center gap-1 text-[10px] text-white/50">
                            <Video size={11} />
                            {candidate.title || "En direct"}
                            <span className="mx-1">·</span>
                            {Number(candidate.viewer_count || 0)} spectateur(s)
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={sent || !!sendingId}
                          onClick={() => void sendInvitation(candidate)}
                          className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40"
                        >
                          {sendingId === candidate.host_id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : sent ? (
                            <Check size={15} />
                          ) : (
                            <UserPlus size={15} />
                          )}
                          {sent ? "Envoyée" : "Inviter"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

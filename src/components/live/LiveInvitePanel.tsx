
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
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  liveId: string;
  currentUserId: string | null;
  isHost: boolean;
}

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface Candidate {
  id: string;
  host_id: string;
  title: string | null;
  viewer_count: number | null;
  profile: Profile | null;
}

interface Viewer {
  user_id: string;
  profile: Profile | null;
}

export default function LiveInvitePanel({
  liveId,
  currentUserId,
  isHost,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [selectedViewer, setSelectedViewer] = useState<Viewer | null>(null);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingId, setSendingId] = useState("");
  const [sentIds, setSentIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Présence des utilisateurs connectés à ce live.
  useEffect(() => {
    if (!currentUserId || !liveId) return;

    const channel = supabase.channel(`live-viewers-${liveId}`, {
      config: {
        presence: { key: currentUserId },
      },
    });

    const refreshViewers = async () => {
      const state = channel.presenceState();

      const ids = [
        ...new Set(
          Object.values(state)
            .flat()
            .map((entry: any) => entry?.user_id as string)
            .filter(
              (id): id is string =>
                Boolean(id) && id !== currentUserId
            )
        ),
      ];

      if (!ids.length) {
        setViewers([]);
        return;
      }

      const { data, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", ids);

      if (profilesError) {
        console.error("Chargement des profils présents :", profilesError);
        return;
      }

      const profiles = (data || []) as Profile[];

      setViewers(
        ids.map((userId) => ({
          user_id: userId,
          profile:
            profiles.find((profile) => profile.id === userId) || null,
        }))
      );
    };

    channel
      .on("presence", { event: "sync" }, () => {
        void refreshViewers();
      })
      .on("presence", { event: "join" }, () => {
        void refreshViewers();
      })
      .on("presence", { event: "leave" }, () => {
        void refreshViewers();
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: currentUserId,
            joined_at: new Date().toISOString(),
          });

          await refreshViewers();
        }
      });

    return () => {
      void channel.untrack();
      void supabase.removeChannel(channel);
      setViewers([]);
    };
  }, [currentUserId, liveId, supabase]);

  // Charger les autres diffuseurs actuellement en direct.
  const loadLiveCandidates = useCallback(
    async (silent = false) => {
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
          .select("id, host_id, title, viewer_count, created_at")
          .eq("status", "live")
          .neq("host_id", currentUserId)
          .neq("id", liveId)
          .order("created_at", { ascending: false })
          .limit(40);

        if (livesError) throw livesError;

        const activeLives = lives || [];

        if (!activeLives.length) {
          setCandidates([]);
          return;
        }

        const hostIds = [
          ...new Set(activeLives.map((item) => item.host_id)),
        ];

        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", hostIds);

        if (profilesError) throw profilesError;

        const profileList = (profiles || []) as Profile[];

        setCandidates(
          activeLives.map((item) => ({
            ...item,
            profile:
              profileList.find(
                (profile) => profile.id === item.host_id
              ) || null,
          }))
        );
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
    },
    [currentUserId, isHost, liveId, supabase]
  );

  // Ouvrir le panneau depuis le bouton Inviter du live.
  useEffect(() => {
    const openHandler = () => {
      if (!isHost) return;

      setError("");
      setSuccess("");
      setSearch("");
      setSelectedViewer(null);
      setIsOpen(true);
    };

    window.addEventListener("moshi-open-invite", openHandler);

    return () => {
      window.removeEventListener("moshi-open-invite", openHandler);
    };
  }, [isHost]);

  // Actualisation des diffuseurs disponibles.
  useEffect(() => {
    if (!isOpen || !isHost) return;

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

    const interval = window.setInterval(() => {
      void loadLiveCandidates(true);
    }, 15000);

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [isOpen, isHost, liveId, loadLiveCandidates, supabase]);

  // Envoyer une invitation à un utilisateur.
  const sendInvitation = async (
    userId: string,
    displayName: string
  ) => {
    if (
      !currentUserId ||
      sendingId ||
      sentIds.includes(userId)
    ) {
      return;
    }

    setSendingId(userId);
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
          invitee_id: userId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Impossible d'envoyer l'invitation."
        );
      }

      setSentIds((previous) => [...previous, userId]);
      setSuccess(`Invitation envoyée à ${displayName}.`);
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

  const displayName = (profile: Profile | null) =>
    profile?.full_name ||
    profile?.username ||
    "Utilisateur Moshi";

  const term = search.trim().toLowerCase();

  const filteredCandidates = candidates.filter((candidate) =>
    [
      candidate.profile?.full_name || "",
      candidate.profile?.username || "",
      candidate.title || "",
    ].some((value) => value.toLowerCase().includes(term))
  );

  const filteredViewers = viewers.filter((viewer) =>
    [
      viewer.profile?.full_name || "",
      viewer.profile?.username || "",
    ].some((value) => value.toLowerCase().includes(term))
  );

  if (!currentUserId || !isHost) return null;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[160] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="max-h-[86dvh] w-full max-w-lg overflow-hidden rounded-t-[28px] border border-white/10 bg-[#160D25] sm:rounded-[28px]"
            onClick={(event) => event.stopPropagation()}
          >
            {/* En-tête */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <Video size={19} className="text-pink-400" />

                  <h2 className="text-lg font-extrabold text-white">
                    Inviter sur mon live
                  </h2>
                </div>

                <p className="mt-1 text-xs text-white/50">
                  Invite un spectateur ou un autre diffuseur
                </p>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
                aria-label="Fermer"
              >
                <X size={19} />
              </button>
            </div>

            <div className="max-h-[calc(86dvh-76px)] overflow-y-auto p-4">
              {/* Recherche */}
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3">
                <Search size={18} className="text-white/40" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher une personne..."
                  className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                />

                <button
                  onClick={() => void loadLiveCandidates(true)}
                  disabled={refreshing}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white/60"
                  aria-label="Actualiser"
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

              {/* Spectateurs présents */}
              <div className="mt-5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white/80">
                  <Users size={16} className="text-green-400" />
                  Spectateurs présents
                </div>

                <span className="text-[11px] text-white/40">
                  {viewers.length} connecté(s)
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {filteredViewers.length === 0 ? (
                  <p className="rounded-xl bg-white/5 px-3 py-4 text-center text-xs text-white/45">
                    Aucun autre spectateur détecté pour le moment.
                  </p>
                ) : (
                  filteredViewers.map((viewer) => {
                    const name = displayName(viewer.profile);
                    const sent = sentIds.includes(viewer.user_id);

                    return (
                      <div
                        key={viewer.user_id}
                        className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.05] p-3"
                      >
                        {/* Cliquer sur la photo ouvre le profil dans le panneau */}
                        <button
                          type="button"
                          onClick={() => setSelectedViewer(viewer)}
                          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white/10"
                          aria-label={`Voir le profil de ${name}`}
                        >
                          {viewer.profile?.avatar_url ? (
                            <Image
                              src={viewer.profile.avatar_url}
                              alt={name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <span className="flex h-full items-center justify-center font-bold text-white">
                              {name.charAt(0).toUpperCase()}
                            </span>
                          )}

                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#160D25] bg-green-400" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedViewer(viewer)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-sm font-bold text-white">
                            {name}
                          </p>

                          {viewer.profile?.username && (
                            <p className="truncate text-xs text-white/45">
                              @{viewer.profile.username}
                            </p>
                          )}

                          <p className="mt-1 text-[10px] text-green-300">
                            Présent dans ce live
                          </p>
                        </button>

                        <button
                          disabled={sent || !!sendingId}
                          onClick={() =>
                            void sendInvitation(viewer.user_id, name)
                          }
                          className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40"
                        >
                          {sendingId === viewer.user_id ? (
                            <Loader2
                              size={15}
                              className="animate-spin"
                            />
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

              {/* Autres diffuseurs en direct */}
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white/80">
                  <Radio size={15} className="text-red-400" />
                  Autres diffuseurs en direct
                </div>

                <span className="text-[11px] text-white/40">
                  {candidates.length} disponible(s)
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-white" />
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <p className="py-6 text-center text-xs text-white/45">
                    Aucun autre diffuseur correspondant.
                  </p>
                ) : (
                  filteredCandidates.map((candidate) => {
                    const profile = candidate.profile;
                    const name = displayName(profile);
                    const sent = sentIds.includes(candidate.host_id);

                    return (
                      <div
                        key={candidate.id}
                        className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.05] p-3"
                      >
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white/10">
                          {profile?.avatar_url ? (
                            <Image
                              src={profile.avatar_url}
                              alt={name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <span className="flex h-full items-center justify-center font-bold text-white">
                              {name.charAt(0).toUpperCase()}
                            </span>
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

                          <p className="mt-1 text-[10px] text-white/50">
                            {candidate.title || "En direct"} ·{" "}
                            {Number(candidate.viewer_count || 0)} spectateur(s)
                          </p>
                        </div>

                        <button
                          disabled={sent || !!sendingId}
                          onClick={() =>
                            void sendInvitation(candidate.host_id, name)
                          }
                          className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-3 py-2.5 text-xs font-bold text-white disabled:opacity-40"
                        >
                          {sendingId === candidate.host_id ? (
                            <Loader2
                              size={15}
                              className="animate-spin"
                            />
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

      {/* Fiche profil du spectateur sélectionné */}
      {selectedViewer && (
        <div
          className="fixed inset-0 z-[180] flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm"
          onClick={() => setSelectedViewer(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#160D25] p-6 text-center text-white"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setSelectedViewer(null)}
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
              aria-label="Fermer le profil"
            >
              <X size={18} />
            </button>

            <div className="relative mx-auto mt-2 h-20 w-20 overflow-hidden rounded-full bg-white/10">
              {selectedViewer.profile?.avatar_url ? (
                <Image
                  src={selectedViewer.profile.avatar_url}
                  alt={displayName(selectedViewer.profile)}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="flex h-full items-center justify-center text-2xl font-bold">
                  {displayName(selectedViewer.profile)
                    .charAt(0)
                    .toUpperCase()}
                </span>
              )}
            </div>

            <h3 className="mt-4 text-lg font-bold">
              {displayName(selectedViewer.profile)}
            </h3>

            {selectedViewer.profile?.username && (
              <p className="mt-1 text-sm text-white/50">
                @{selectedViewer.profile.username}
              </p>
            )}

            <p className="mt-3 text-xs text-green-300">
              Spectateur actuellement présent dans ton live
            </p>

            <button
              disabled={
                !!sendingId ||
                sentIds.includes(selectedViewer.user_id)
              }
              onClick={() =>
                void sendInvitation(
                  selectedViewer.user_id,
                  displayName(selectedViewer.profile)
                )
              }
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 py-3 font-bold disabled:opacity-50"
            >
              {sendingId === selectedViewer.user_id ? (
                <Loader2 size={18} className="animate-spin" />
              ) : sentIds.includes(selectedViewer.user_id) ? (
                <Check size={18} />
              ) : (
                <UserPlus size={18} />
              )}

              {sentIds.includes(selectedViewer.user_id)
                ? "Invitation envoyée"
                : "Inviter à rejoindre mon live"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

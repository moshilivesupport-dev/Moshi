
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  X,
  Search,
  UserPlus,
  Video,
  Check,
  Loader2,
  Radio,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface LiveInvitePanelProps {
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

interface Invitation {
  id: string;
  live_id: string;
  inviter_id: string;
  invitee_id: string;
  status: string;
  created_at: string;
}

export default function LiveInvitePanel({
  liveId,
  currentUserId,
  isHost,
}: LiveInvitePanelProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingId, setSendingId] = useState("");
  const [sentIds, setSentIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [incoming, setIncoming] = useState<Invitation | null>(null);
  const [inviter, setInviter] = useState<Profile | null>(null);
  const [responding, setResponding] = useState(false);

  const loadIncoming = useCallback(async () => {
    if (!currentUserId || isHost) return;

    const { data, error: queryError } = await supabase
      .from("live_invitations")
      .select("id, live_id, inviter_id, invitee_id, status, created_at")
      .eq("live_id", liveId)
      .eq("invitee_id", currentUserId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (queryError) {
      console.error("Lecture invitation live:", queryError.message);
      return;
    }

    if (!data) {
      setIncoming(null);
      setInviter(null);
      return;
    }

    setIncoming(data as Invitation);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .eq("id", data.inviter_id)
      .maybeSingle();

    setInviter(profile as Profile | null);
  }, [currentUserId, isHost, liveId, supabase]);

  useEffect(() => {
    const openHandler = () => {
      if (isHost) {
        setError("");
        setSuccess("");
        setIsOpen(true);
      }
    };

    window.addEventListener("moshi-open-invite", openHandler);

    return () => {
      window.removeEventListener("moshi-open-invite", openHandler);
    };
  }, [isHost]);

  useEffect(() => {
    if (!currentUserId || !liveId) return;

    void loadIncoming();

    if (isHost) return;

    const channel = supabase
      .channel(`live-invitations-${currentUserId}-${liveId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_invitations",
          filter: `invitee_id=eq.${currentUserId}`,
        },
        (payload) => {
          const row = payload.new as Invitation | undefined;

          if (
            row?.live_id === liveId &&
            row.status === "pending"
          ) {
            void loadIncoming();
          }

          if (
            row?.live_id === liveId &&
            row.status !== "pending"
          ) {
            setIncoming(null);
            setInviter(null);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, isHost, liveId, loadIncoming, supabase]);

  useEffect(() => {
    if (!isOpen || !isHost || !currentUserId) return;

    const term = search.trim();

    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;

    const searchProfiles = async () => {
      setSearching(true);
      setError("");

      const safeTerm = term.replace(/[,%()]/g, " ").trim();

      if (safeTerm.length < 2) {
        setResults([]);
        setSearching(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .or(
          `username.ilike.%${safeTerm}%,full_name.ilike.%${safeTerm}%`
        )
        .neq("id", currentUserId)
        .limit(12);

      if (cancelled) return;

      if (queryError) {
        console.error("Recherche utilisateurs:", queryError);
        setError("Impossible de rechercher les utilisateurs.");
        setResults([]);
      } else {
        setResults((data || []) as Profile[]);
      }

      setSearching(false);
    };

    const timeout = window.setTimeout(() => {
      void searchProfiles();
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [currentUserId, isHost, isOpen, search, supabase]);

  const sendInvitation = async (profile: Profile) => {
    if (!currentUserId || sendingId) return;

    setSendingId(profile.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/live/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          live_id: liveId,
          invitee_id: profile.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Impossible d'envoyer l'invitation."
        );
      }

      setSentIds((previous) => [...previous, profile.id]);
      setSuccess(
        `Invitation envoyée à ${
          profile.username || profile.full_name || "cet utilisateur"
        }.`
      );
    } catch (err: any) {
      setError(err?.message || "Erreur lors de l'invitation.");
    } finally {
      setSendingId("");
    }
  };

  const respondToInvitation = async (
    status: "accepted" | "declined"
  ) => {
    if (!incoming || responding) return;

    setResponding(true);
    setError("");

    try {
      const response = await fetch(
        `/live/invitations/${incoming.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Impossible de répondre à l'invitation."
        );
      }

      setIncoming(null);
      setInviter(null);

      if (status === "accepted") {
        // Recharge la page afin de récupérer un nouveau token LiveKit
        // avec les permissions de publication caméra et micro.
        window.location.assign(`/live/${liveId}`);
      }
    } catch (err: any) {
      setError(err?.message || "Une erreur est survenue.");
    } finally {
      setResponding(false);
    }
  };

  if (!currentUserId) return null;

  return (
    <>
      {incoming && !isHost && (
        <div className="fixed left-4 right-4 top-[max(env(safe-area-inset-top),16px)] z-[150] rounded-2xl border border-purple-400/40 bg-[#180D29] p-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white/10">
              {inviter?.avatar_url ? (
                <Image
                  src={inviter.avatar_url}
                  alt="Hôte"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Video size={22} />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-bold text-white">
                Invitation à rejoindre le live
              </p>
              <p className="truncate text-xs text-white/60">
                {inviter?.full_name ||
                  inviter?.username ||
                  "Un créateur"}{" "}
                t'invite à monter sur scène.
              </p>
            </div>
          </div>

          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={responding}
              onClick={() => void respondToInvitation("declined")}
              className="flex-1 rounded-xl bg-white/10 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              Refuser
            </button>

            <button
              type="button"
              disabled={responding}
              onClick={() => void respondToInvitation("accepted")}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {responding ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Video size={17} />
              )}
              Accepter
            </button>
          </div>
        </div>
      )}

      {isOpen && isHost && (
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
                <h2 className="text-lg font-extrabold text-white">
                  Inviter sur le live
                </h2>
                <p className="text-xs text-white/50">
                  Recherche un utilisateur Moshi
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
                  placeholder="Nom ou nom d'utilisateur..."
                  className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                />
              </div>

              {error && (
                <p className="mt-3 text-sm text-red-400">{error}</p>
              )}

              {success && (
                <p className="mt-3 flex items-center gap-2 text-sm text-green-400">
                  <Check size={16} />
                  {success}
                </p>
              )}

              <div className="mt-4 max-h-[48dvh] space-y-2 overflow-y-auto">
                {searching ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="animate-spin text-white" />
                  </div>
                ) : search.trim().length < 2 ? (
                  <p className="py-8 text-center text-sm text-white/45">
                    Saisis au moins deux caractères pour rechercher.
                  </p>
                ) : results.length === 0 ? (
                  <p className="py-8 text-center text-sm text-white/45">
                    Aucun utilisateur trouvé.
                  </p>
                ) : (
                  results.map((profile) => {
                    const name =
                      profile.full_name ||
                      profile.username ||
                      "Utilisateur Moshi";

                    const sent = sentIds.includes(profile.id);

                    return (
                      <div
                        key={profile.id}
                        className="flex items-center gap-3 rounded-xl bg-white/[0.05] p-3"
                      >
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white/10">
                          {profile.avatar_url ? (
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
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-white">
                            {name}
                          </p>
                          {profile.username && (
                            <p className="truncate text-xs text-white/45">
                              @{profile.username}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={sent || !!sendingId}
                          onClick={() => void sendInvitation(profile)}
                          className="flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                        >
                          {sendingId === profile.id ? (
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


"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Users,
  X,
  UserMinus,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Video,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  liveId: string;
  currentUserId: string | null;
  isHost: boolean;
}

interface GuestProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface Guest {
  invitationId: string;
  userId: string;
  profile: GuestProfile | null;
}

export default function LiveGuestManager({
  liveId,
  currentUserId,
  isHost,
}: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [isOpen, setIsOpen] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadGuests = useCallback(
    async (silent = false) => {
      if (!liveId || !currentUserId || !isHost) return;

      if (silent) setRefreshing(true);
      else setLoading(true);

      setError("");

      try {
        const { data: invitations, error: invitationsError } =
          await supabase
            .from("live_invitations")
            .select("id, invitee_id")
            .eq("live_id", liveId)
            .eq("inviter_id", currentUserId)
            .eq("status", "accepted")
            .order("responded_at", { ascending: true });

        if (invitationsError) throw invitationsError;

        const rows = invitations || [];
        const guestIds = [
          ...new Set(rows.map((item) => item.invitee_id)),
        ];

        let profiles: GuestProfile[] = [];

        if (guestIds.length > 0) {
          const { data, error: profilesError } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url")
            .in("id", guestIds);

          if (profilesError) throw profilesError;
          profiles = (data || []) as GuestProfile[];
        }

        setGuests(
          rows.map((invitation) => ({
            invitationId: invitation.id,
            userId: invitation.invitee_id,
            profile:
              profiles.find(
                (profile) => profile.id === invitation.invitee_id
              ) || null,
          }))
        );
      } catch (err) {
        console.error("Chargement des invités :", err);
        setError(
          err instanceof Error
            ? err.message
            : "Impossible de charger les invités."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentUserId, isHost, liveId, supabase]
  );

  useEffect(() => {
    if (!isOpen || !isHost) return;

    void loadGuests();

    const channel = supabase
      .channel(`live-guests-${liveId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_invitations",
          filter: `live_id=eq.${liveId}`,
        },
        () => {
          void loadGuests(true);
        }
      )
      .subscribe();

    const interval = window.setInterval(() => {
      void loadGuests(true);
    }, 10000);

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [isOpen, isHost, liveId, loadGuests, supabase]);

  const removeGuest = async (guest: Guest) => {
    if (removingId) return;

    const name =
      guest.profile?.full_name ||
      guest.profile?.username ||
      "cet invité";

    const confirmed = window.confirm(
      `Retirer ${name} de ce live ? Il sera immédiatement déconnecté.`
    );

    if (!confirmed) return;

    setRemovingId(guest.userId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/livekit/kick", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          live_id: liveId,
          guest_id: guest.userId,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        if (result?.invitationRevoked) {
          setGuests((previous) =>
            previous.filter((item) => item.userId !== guest.userId)
          );
        }

        throw new Error(
          result?.error || "Impossible de retirer cet invité."
        );
      }

      setGuests((previous) =>
        previous.filter((item) => item.userId !== guest.userId)
      );

      setSuccess(`${name} a été retiré du live.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors du retrait de l'invité."
      );

      // Recharger pour refléter l'état réel de l'invitation.
      void loadGuests(true);
    } finally {
      setRemovingId("");
    }
  };

  if (!currentUserId || !isHost) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setSuccess("");
          setIsOpen(true);
        }}
        className="fixed right-4 top-[46%] z-[80] flex items-center gap-2 rounded-full border border-white/15 bg-black/65 px-3 py-2.5 text-xs font-bold text-white shadow-xl backdrop-blur-xl"
        aria-label="Gérer les invités du live"
      >
        <Users size={17} className="text-pink-400" />
        Invités
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-500 px-1 text-[10px]">
          {guests.length}
        </span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[180] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setIsOpen(false)}
        >
          <section
            className="max-h-[82dvh] w-full max-w-md overflow-hidden rounded-t-[28px] border border-white/10 bg-[#160D25] sm:rounded-[28px]"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <Users size={19} className="text-pink-400" />
                  <h2 className="text-lg font-extrabold text-white">
                    Invités du live
                  </h2>
                </div>
                <p className="mt-1 text-xs text-white/50">
                  {guests.length} invité(s) avec accès accepté
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadGuests(true)}
                  disabled={refreshing}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70"
                  aria-label="Actualiser la liste"
                >
                  <RefreshCw
                    size={16}
                    className={refreshing ? "animate-spin" : ""}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
                  aria-label="Fermer"
                >
                  <X size={19} />
                </button>
              </div>
            </header>

            <div className="max-h-[calc(82dvh-76px)] overflow-y-auto p-4">
              {error && (
                <p className="mb-3 rounded-xl bg-red-500/10 p-3 text-xs text-red-300">
                  {error}
                </p>
              )}

              {success && (
                <p className="mb-3 rounded-xl bg-green-500/10 p-3 text-xs text-green-300">
                  {success}
                </p>
              )}

              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2
                    size={25}
                    className="animate-spin text-pink-400"
                  />
                </div>
              ) : guests.length === 0 ? (
                <div className="py-10 text-center">
                  <Video
                    size={34}
                    className="mx-auto text-white/25"
                  />
                  <p className="mt-3 text-sm font-semibold text-white/80">
                    Aucun invité pour le moment
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    Les personnes qui acceptent tes invitations apparaîtront ici.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {guests.map((guest) => {
                    const name =
                      guest.profile?.full_name ||
                      guest.profile?.username ||
                      "Utilisateur Moshi";

                    return (
                      <div
                        key={guest.invitationId}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3"
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white/10">
                          {guest.profile?.avatar_url ? (
                            <Image
                              src={guest.profile.avatar_url}
                              alt={name}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          ) : (
                            <span className="flex h-full items-center justify-center font-bold text-white">
                              {name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-white">
                            {name}
                          </p>
                          {guest.profile?.username && (
                            <p className="truncate text-xs text-white/45">
                              @{guest.profile.username}
                            </p>
                          )}
                          <p className="mt-1 flex items-center gap-1 text-[10px] text-green-300">
                            <ShieldCheck size={12} />
                            Invitation acceptée
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => void removeGuest(guest)}
                          disabled={!!removingId}
                          className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-2.5 text-xs font-bold text-red-300 disabled:opacity-40"
                        >
                          {removingId === guest.userId ? (
                            <Loader2
                              size={15}
                              className="animate-spin"
                            />
                          ) : (
                            <UserMinus size={15} />
                          )}
                          Retirer
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="mt-4 text-center text-[10px] leading-relaxed text-white/35">
                Le retrait révoque l'accès invité et demande à LiveKit de
                déconnecter immédiatement cette personne.
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

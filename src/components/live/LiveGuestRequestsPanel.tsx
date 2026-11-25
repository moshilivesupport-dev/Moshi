
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Check,
  X,
  Users,
  Loader2,
  RefreshCw,
  Video,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type GuestRequest = {
  id: string;
  live_id: string;
  requester_id: string;
  status: string;
  created_at: string;
  profile: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

type Props = {
  liveId: string;
  currentUserId: string | null;
  isHost: boolean;
};

export default function LiveGuestRequestsPanel({
  liveId,
  currentUserId,
  isHost,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [isOpen, setIsOpen] = useState(false);
  const [requests, setRequests] = useState<GuestRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadRequests = useCallback(async (silent = false) => {
    if (!liveId || !currentUserId || !isHost) return;

    if (!silent) setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/live/guest-requests?liveId=${encodeURIComponent(liveId)}`,
        { cache: "no-store" }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Chargement impossible.");
      }

      setRequests(Array.isArray(result.requests) ? result.requests : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur de chargement."
      );
    } finally {
      setLoading(false);
    }
  }, [liveId, currentUserId, isHost]);

  useEffect(() => {
    if (!isOpen || !isHost) return;

    void loadRequests();

    const channel = supabase
      .channel(`live-guest-requests-${liveId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_guest_requests",
          filter: `live_id=eq.${liveId}`,
        },
        () => void loadRequests(true)
      )
      .subscribe();

    // Repli utile si le canal Realtime est momentanément indisponible.
    const interval = window.setInterval(
      () => void loadRequests(true),
      12000
    );

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [isOpen, isHost, liveId, loadRequests, supabase]);

  const respond = async (
    item: GuestRequest,
    action: "accept" | "decline"
  ) => {
    if (busyId) return;

    setBusyId(item.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/live/guest-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: item.id,
          action,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Impossible de traiter la demande.");
      }

      setRequests((previous) =>
        previous.filter((request) => request.id !== item.id)
      );

      setSuccess(
        action === "accept"
          ? "Demande acceptée. L'invitation a été envoyée."
          : "Demande refusée."
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
      void loadRequests(true);
    } finally {
      setBusyId("");
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
        className="fixed right-4 top-[39%] z-[80] flex items-center gap-2 rounded-full border border-white/15 bg-black/70 px-3 py-2.5 text-xs font-bold text-white shadow-xl backdrop-blur-xl"
        aria-label="Demandes pour rejoindre le live"
      >
        <Users size={17} className="text-pink-400" />
        Demandes
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-500 px-1 text-[10px]">
          {requests.length}
        </span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[190] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setIsOpen(false)}
        >
          <section
            className="max-h-[82dvh] w-full max-w-md overflow-hidden rounded-t-[28px] border border-white/10 bg-[#160D25] sm:rounded-[28px]"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-white">
                  <Users size={19} className="text-pink-400" />
                  Demandes pour rejoindre
                </h2>
                <p className="mt-1 text-xs text-white/50">
                  {requests.length} demande(s) en attente
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadRequests()}
                  disabled={loading}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70"
                  aria-label="Actualiser"
                >
                  <RefreshCw
                    size={16}
                    className={loading ? "animate-spin" : ""}
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

              {loading && requests.length === 0 ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="animate-spin text-pink-400" size={25} />
                </div>
              ) : requests.length === 0 ? (
                <div className="py-10 text-center">
                  <Video size={34} className="mx-auto text-white/25" />
                  <p className="mt-3 text-sm font-semibold text-white/80">
                    Aucune demande pour le moment
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    Les demandes des spectateurs apparaîtront ici.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {requests.map((item) => {
                    const profile = item.profile;
                    const name =
                      profile?.full_name ||
                      profile?.username ||
                      "Utilisateur Moshi";

                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3"
                      >
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white/10">
                          {profile?.avatar_url ? (
                            <Image
                              src={profile.avatar_url}
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
                          {profile?.username && (
                            <p className="truncate text-xs text-white/45">
                              @{profile.username}
                            </p>
                          )}
                          <p className="mt-1 text-[10px] text-white/40">
                            Souhaite rejoindre ton live
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => void respond(item, "accept")}
                            disabled={!!busyId}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/20 text-green-300 disabled:opacity-40"
                            aria-label={`Accepter ${name}`}
                          >
                            {busyId === item.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Check size={17} />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => void respond(item, "decline")}
                            disabled={!!busyId}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/20 text-red-300 disabled:opacity-40"
                            aria-label={`Refuser ${name}`}
                          >
                            <X size={17} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

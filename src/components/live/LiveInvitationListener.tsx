
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Video, X, Check, Loader2 } from "lucide-react";

type Invitation = {
  id: string;
  live_id: string;
  inviter_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  inviter?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  live?: {
    title: string | null;
  } | null;
};

export default function LiveInvitationListener() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const loadPendingInvitation = useCallback(async (userId: string) => {
    const { data, error: queryError } = await supabase
      .from("live_invitations")
      .select("id, live_id, inviter_id, status, created_at")
      .eq("invitee_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1);

    if (queryError) {
      console.error("Chargement invitation:", queryError);
      return;
    }

    const pending = data?.[0];
    if (!pending) return;

    const [{ data: profile }, { data: live }] = await Promise.all([
      supabase
        .from("profiles")
        .select("username, full_name, avatar_url")
        .eq("id", pending.inviter_id)
        .maybeSingle(),
      supabase
        .from("lives")
        .select("title, status")
        .eq("id", pending.live_id)
        .maybeSingle(),
    ]);

    if (!live || live.status !== "live") return;

    setInvitation({
      ...pending,
      inviter: profile,
      live,
    });
  }, [supabase]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function initialize() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) return;

      await loadPendingInvitation(user.id);
      if (cancelled) return;

      channel = supabase
        .channel(`global-live-invitations-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "live_invitations",
            filter: `invitee_id=eq.${user.id}`,
          },
          async (payload) => {
            const incoming = payload.new as Invitation;

            if (incoming.status !== "pending") return;

            const [{ data: profile }, { data: live }] = await Promise.all([
              supabase
                .from("profiles")
                .select("username, full_name, avatar_url")
                .eq("id", incoming.inviter_id)
                .maybeSingle(),
              supabase
                .from("lives")
                .select("title, status")
                .eq("id", incoming.live_id)
                .maybeSingle(),
            ]);

            if (!live || live.status !== "live") return;

            setInvitation({
              ...incoming,
              inviter: profile,
              live,
            });
            setError("");
          }
        )
        .subscribe();
    }

    void initialize();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [supabase, loadPendingInvitation]);

  const respond = async (status: "accepted" | "declined") => {
    if (!invitation || processing) return;

    setProcessing(true);
    setError("");

    try {
      const response = await fetch(
        `/live/invitations/${invitation.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Impossible de répondre.");
      }

      if (status === "accepted") {
        router.push(`/live/${invitation.live_id}`);
        router.refresh();
        return;
      }

      setInvitation(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    } finally {
      setProcessing(false);
    }
  };

  if (!invitation) return null;

  const inviterName =
    invitation.inviter?.full_name ||
    invitation.inviter?.username ||
    "Un utilisateur";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-950 p-5 text-white shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600">
              <Video size={21} />
            </span>
            <div>
              <p className="text-sm font-bold">Invitation au live</p>
              <p className="text-xs text-white/50">Moshi Live</p>
            </div>
          </div>

          <button
            onClick={() => setInvitation(null)}
            disabled={processing}
            aria-label="Fermer"
            className="rounded-full bg-white/10 p-2"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-center text-lg font-bold">
          {inviterName} t'invite à rejoindre son live.
        </p>

        {invitation.live?.title && (
          <p className="mt-2 text-center text-sm text-white/60">
            {invitation.live.title}
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-xl bg-red-500/15 p-3 text-center text-xs text-red-300">
            {error}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => void respond("declined")}
            disabled={processing}
            className="flex items-center justify-center gap-2 rounded-full bg-white/10 py-3 text-sm font-bold disabled:opacity-50"
          >
            <X size={17} />
            Refuser
          </button>

          <button
            onClick={() => void respond("accepted")}
            disabled={processing}
            className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 py-3 text-sm font-bold disabled:opacity-50"
          >
            {processing ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Check size={17} />
            )}
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}

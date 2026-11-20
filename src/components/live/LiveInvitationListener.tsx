
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  X,
  Check,
  Loader2,
  Swords,
  Video,
  Sparkles,
} from "lucide-react";

type Invitation = {
  id: string;
  live_id: string;
  inviter_id: string;
  invitation_type?: "guest" | "match";
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
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const loadPendingInvitation = useCallback(
    async (userId: string) => {
      const { data, error: queryError } = await supabase
        .from("live_invitations")
        .select(
          "id, live_id, inviter_id, invitation_type, status, created_at"
        )
        .eq("invitee_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1);

      if (queryError) {
        console.error("Chargement invitation :", queryError);
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
      } as Invitation);
    },
    [supabase]
  );

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

            const [{ data: profile }, { data: live }] =
              await Promise.all([
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
        err instanceof Error
          ? err.message
          : "Une erreur est survenue."
      );
    } finally {
      setProcessing(false);
    }
  };

  if (!invitation) return null;

  const isMatch = invitation.invitation_type === "match";

  const inviterName =
    invitation.inviter?.full_name ||
    invitation.inviter?.username ||
    "Un utilisateur";

  const avatar = invitation.inviter?.avatar_url;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-black/75 p-5 backdrop-blur-md">
      <div className="relative w-full max-w-sm overflow-hidden rounded-[30px] border border-pink-400/25 bg-[#160D25] p-5 text-white shadow-[0_0_60px_rgba(192,38,211,0.22)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-pink-600/20 blur-3xl" />

        <button
          onClick={() => setInvitation(null)}
          disabled={processing}
          aria-label="Fermer"
          className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2"
        >
          <X size={18} />
        </button>

        <div className="relative z-[1] text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-pink-300/30 bg-gradient-to-br from-pink-500 to-purple-700 shadow-lg shadow-purple-900/40">
            {isMatch ? (
              <Swords size={29} strokeWidth={2.4} />
            ) : (
              <Video size={27} />
            )}
          </div>

          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-pink-300">
            Moshi Live
          </p>

          <h2 className="mt-2 text-2xl font-black">
            {isMatch ? "MATCH !" : "Invitation au live"}
          </h2>

          <p className="mt-2 text-sm text-white/65">
            {isMatch
              ? "Tu as reçu un défi. Es-tu prêt à relever le challenge ?"
              : "On t'invite à rejoindre ce live."}
          </p>

          <div className="my-7 flex items-center justify-center gap-3">
            <div className="flex w-24 flex-col items-center gap-2">
              <div className="relative h-[76px] w-[76px] overflow-hidden rounded-full border-[3px] border-pink-400 bg-white/10 shadow-lg shadow-pink-500/20">
                {avatar ? (
                  <Image
                    src={avatar}
                    alt={inviterName}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl font-black">
                    {inviterName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <p className="max-w-full truncate text-xs font-bold">
                {inviterName}
              </p>
            </div>

            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-purple-300/30 bg-gradient-to-br from-pink-500 to-purple-700 shadow-lg shadow-purple-500/30">
              {isMatch ? (
                <Swords size={28} />
              ) : (
                <Sparkles size={27} />
              )}
              <span className="absolute -bottom-2 rounded-full bg-[#160D25] px-2 text-[9px] font-black text-pink-200">
                VS
              </span>
            </div>

            <div className="flex w-24 flex-col items-center gap-2">
              <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full border-[3px] border-purple-400 bg-white/5 text-2xl font-black text-purple-200">
                ?
              </div>
              <p className="text-xs font-bold text-white/70">
                Toi
              </p>
            </div>
          </div>

          {invitation.live?.title && (
            <p className="mb-4 truncate rounded-xl bg-white/5 px-3 py-2 text-xs text-white/60">
              {invitation.live.title}
            </p>
          )}

          {error && (
            <p className="mb-4 rounded-xl bg-red-500/15 p-3 text-xs text-red-300">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => void respond("declined")}
              disabled={processing}
              className="rounded-full border border-white/10 bg-white/10 py-3.5 text-sm font-bold disabled:opacity-50"
            >
              Refuser
            </button>

            <button
              onClick={() => void respond("accepted")}
              disabled={processing}
              className="flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 py-3.5 text-sm font-black shadow-lg shadow-purple-900/30 disabled:opacity-50"
            >
              {processing ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Check size={17} />
              )}
              {isMatch ? "Accepter le Match" : "Rejoindre"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

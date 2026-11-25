
"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  Swords,
  Video,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Invitation = {
  id: string;
  live_id: string;
  inviter_id: string;
  invitee_id: string;
  invitation_type: "guest" | "match";
  status: string;
  created_at: string;
};

type InvitationDetails = {
  invitation: Invitation;
  username: string;
  avatarUrl: string | null;
  liveTitle: string;
};

export default function LiveInvitationListener() {
  const router = useRouter();

  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  const supabase = createClient();

  const loadInvitation = useCallback(
    async (userId: string) => {
      const { data: invitations, error: invitationError } =
        await supabase
          .from("live_invitations")
          .select(
            "id, live_id, inviter_id, invitee_id, invitation_type, status, created_at"
          )
          .eq("invitee_id", userId)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1);

      if (invitationError) {
        console.error("Load invitation error:", invitationError);
        return;
      }

      const invitation = invitations?.[0] as Invitation | undefined;

      if (!invitation) {
        setDetails(null);
        return;
      }

      const [
        { data: profile, error: profileError },
        { data: live, error: liveError },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("username, full_name, avatar_url")
          .eq("id", invitation.inviter_id)
          .maybeSingle(),

        supabase
          .from("lives")
          .select("title, status")
          .eq("id", invitation.live_id)
          .maybeSingle(),
      ]);

      if (profileError) {
        console.error("Invitation profile error:", profileError);
      }

      if (liveError) {
        console.error("Invitation live error:", liveError);
      }

      if (!live || live.status !== "live") {
        await supabase
          .from("live_invitations")
          .update({
            status: "declined",
            responded_at: new Date().toISOString(),
          })
          .eq("id", invitation.id)
          .eq("status", "pending");

        setDetails(null);
        return;
      }

      setDetails({
        invitation: {
          ...invitation,
          invitation_type:
            invitation.invitation_type === "match" ? "match" : "guest",
        },
        username:
          profile?.full_name ||
          profile?.username ||
          "Un utilisateur Moshi",
        avatarUrl: profile?.avatar_url || null,
        liveTitle: live.title || "Live en cours",
      });
    },
    [supabase]
  );

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let active = true;

    const initialize = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !user) {
        setChecking(false);
        return;
      }

      await loadInvitation(user.id);

      if (!active) return;

      channel = supabase
        .channel(`moshi-invitations-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "live_invitations",
            filter: `invitee_id=eq.${user.id}`,
          },
          () => {
            void loadInvitation(user.id);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "live_invitations",
            filter: `invitee_id=eq.${user.id}`,
          },
          () => {
            void loadInvitation(user.id);
          }
        )
        .subscribe();

      setChecking(false);
    };

    void initialize();

    return () => {
      active = false;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [loadInvitation, supabase]);

  const respond = async (status: "accepted" | "declined") => {
    if (!details || loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/live/invitations/${details.invitation.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Impossible de traiter l'invitation."
        );
      }

      const liveId = details.invitation.live_id;
      const invitationType = details.invitation.invitation_type;

      setDetails(null);

      if (status === "accepted") {
        if (invitationType === "guest") {
          window.dispatchEvent(
            new CustomEvent("moshi-livekit-refresh", {
              detail: { liveId },
            })
          );
        }

        router.push(`/live/${liveId}`);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  };

  if (checking || !details) {
    return null;
  }

  const isMatch = details.invitation.invitation_type === "match";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/10 bg-[#160D25] shadow-[0_25px_100px_rgba(0,0,0,0.65)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-600" />

        <button
          type="button"
          onClick={() => void respond("declined")}
          disabled={loading}
          aria-label="Fermer l'invitation"
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white disabled:opacity-50"
        >
          <X size={18} />
        </button>

        <div className="px-6 pb-6 pt-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/20 to-violet-600/20 ring-1 ring-pink-400/30">
            {isMatch ? (
              <Swords className="h-8 w-8 text-pink-300" />
            ) : (
              <Video className="h-8 w-8 text-pink-300" />
            )}
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.25em] text-pink-300">
            MOSHI LIVE
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            {isMatch ? "Défi Match !" : "Invitation au live"}
          </h2>

          <p className="mt-2 text-sm leading-6 text-white/60">
            {isMatch
              ? "Tu as reçu une invitation à participer à un Match."
              : "Tu es invité(e) à rejoindre un live en tant qu'invité."}
          </p>

          <div className="my-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-center gap-4">
              <div className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-full border-2 border-pink-400 bg-gradient-to-br from-pink-500 to-violet-600">
                {details.avatarUrl ? (
                  <Image
                    src={details.avatarUrl}
                    alt={details.username}
                    fill
                    sizes="68px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-black text-white">
                    {details.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="min-w-0 text-left">
                <p className="text-xs text-white/45">
                  {isMatch ? "Ton adversaire t'invite" : "Invitation envoyée par"}
                </p>
                <p className="mt-1 truncate font-bold text-white">
                  {details.username}
                </p>
                <p className="mt-1 truncate text-xs text-white/50">
                  {details.liveTitle}
                </p>
              </div>
            </div>

            {isMatch && (
              <div className="mt-5 flex items-center justify-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-pink-400/50" />
                <span className="rounded-full border border-pink-400/30 bg-pink-500/10 px-4 py-1.5 text-sm font-black tracking-widest text-pink-300">
                  VS
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-violet-400/50" />
              </div>
            )}
          </div>

          {error && (
            <p className="mb-4 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => void respond("declined")}
              disabled={loading}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 font-bold text-white/75 transition hover:bg-white/10 disabled:opacity-50"
            >
              <X size={17} />
              Refuser
            </button>

            <button
              type="button"
              onClick={() => void respond("accepted")}
              disabled={loading}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 font-bold text-white shadow-lg shadow-pink-500/20 transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Check size={18} />
              )}
              Accepter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

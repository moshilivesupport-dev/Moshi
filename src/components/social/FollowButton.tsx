"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Plus, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  targetUserId: string;
  currentUserId?: string;
  variant?: "default" | "profile" | "small";
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({
  targetUserId,
  currentUserId,
  variant = "profile",
  onFollowChange,
}: FollowButtonProps) {
  const supabase = createClient();
  const router = useRouter();

  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(
    currentUserId ? { id: currentUserId } : null
  );

  useEffect(() => {
    if (currentUserId) {
      setCurrentUser({ id: currentUserId });
      return;
    }
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user ? { id: user.id } : null);
    })();
  }, [currentUserId, supabase]);

  useEffect(() => {
    if (!currentUser || currentUser.id === targetUserId) {
      setChecking(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUser.id)
        .eq("following_id", targetUserId)
        .maybeSingle();
      setIsFollowing(!!data);
      setChecking(false);
    })();
  }, [currentUser, targetUserId, supabase]);

  const handleFollow = async () => {
    if (!currentUser) {
      router.push("/auth/login");
      return;
    }
    if (currentUser.id === targetUserId) return;

    setLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", targetUserId);
        if (error) throw error;
        setIsFollowing(false);
        onFollowChange?.(false);
      } else {
        const { error } = await supabase.from("follows").insert({
          follower_id: currentUser.id,
          following_id: targetUserId,
        });
        if (error) throw error;
        setIsFollowing(true);
        onFollowChange?.(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;
  if (currentUser?.id === targetUserId) return null;

  // Variante feed TikTok : petit + rouge sous l'avatar
  if (variant === "small") {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void handleFollow();
        }}
        disabled={loading}
        className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center border-2 border-black shadow active:scale-90 transition",
          isFollowing ? "bg-neutral-600" : "bg-red-500"
        )}
        aria-label={isFollowing ? "Abonne" : "Suivre"}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 text-white animate-spin" />
        ) : isFollowing ? (
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        ) : (
          <Plus className="w-3.5 h-3.5 text-white" strokeWidth={3} />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleFollow()}
      disabled={loading}
      className={cn(
        "flex items-center justify-center gap-1.5 font-semibold transition active:scale-95 disabled:opacity-70",
        variant === "profile" ? "py-2.5 rounded-lg text-sm w-full" : "px-4 py-2 rounded-full text-sm",
        isFollowing
          ? "bg-neutral-800 text-white border border-neutral-700"
          : "bg-red-500 text-white"
      )}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        "Abonne"
      ) : (
        "S'abonner"
      )}
    </button>
  );
}
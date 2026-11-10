"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
  targetUserId: string;
  initialFollowing?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export default function FollowButton({
  targetUserId,
  initialFollowing = false,
  className,
  size = "md",
}: FollowButtonProps) {
  const supabase = createClient();
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  useEffect(() => {
    if (!currentUserId || currentUserId === targetUserId) return;

    supabase
      .from("follows")
      .select("id")
      .eq("follower_id", currentUserId)
      .eq("following_id", targetUserId)
      .maybeSingle()
      .then(({ data }) => {
        setFollowing(!!data);
      });
  }, [currentUserId, targetUserId, supabase]);

  if (!currentUserId || currentUserId === targetUserId) return null;

  const toggle = async () => {
    if (loading) return;
    setLoading(true);

    if (following) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId);
      setFollowing(false);
    } else {
      await supabase.from("follows").insert({
        follower_id: currentUserId,
        following_id: targetUserId,
      });
      await supabase.from("notifications").insert({
        user_id: targetUserId,
        actor_id: currentUserId,
        type: "follow",
        message: "a commencé à vous suivre",
        link: `/profil/${currentUserId}`,
      });
      setFollowing(true);
    }

    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={cn(
        "rounded-full font-semibold transition active:scale-95 disabled:opacity-60",
        size === "sm" ? "px-3 py-1 text-xs" : "px-5 py-1.5 text-sm",
        following
          ? "bg-neutral-800 text-white border border-neutral-600"
          : "bg-red-500 text-white",
        className
      )}
    >
      {following ? "Suivi" : "Suivre"}
    </button>
  );
}
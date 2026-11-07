"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { UserPlus, UserCheck } from "lucide-react";

interface Props {
  targetUserId: string;
  currentUserId?: string;
  size?: "sm" | "md";
}

export function FollowButton({ targetUserId, currentUserId, size = "md" }: Props) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!currentUserId || currentUserId === targetUserId) return;
    supabase
      .from("followers")
      .select("id")
      .eq("follower_id", currentUserId)
      .eq("following_id", targetUserId)
      .maybeSingle()
      .then(({ data }) => setIsFollowing(!!data));
  }, [currentUserId, targetUserId]);

  const toggle = async () => {
    if (!currentUserId || loading) return;
    setLoading(true);
    try {
      if (isFollowing) {
        await supabase
          .from("followers")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", targetUserId);
        setIsFollowing(false);
      } else {
        await supabase.from("followers").insert({
          follower_id: currentUserId,
          following_id: targetUserId,
        });
        setIsFollowing(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!currentUserId || currentUserId === targetUserId) return null;

  return (
    <Button
      size={size}
      variant={isFollowing ? "outline" : "primary"}
      onClick={toggle}
      loading={loading}
      className={size === "sm" ? "px-3 py-1 text-xs" : ""}
    >
      {isFollowing ? (
        <>
          <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Suivi
        </>
      ) : (
        <>
          <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Suivre
        </>
      )}
    </Button>
  );
}

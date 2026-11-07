"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export function useFollow(targetUserId: string, currentUserId?: string) {
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

  const toggle = useCallback(async () => {
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
  }, [currentUserId, targetUserId, isFollowing, loading]);

  return { isFollowing, loading, toggle };
}

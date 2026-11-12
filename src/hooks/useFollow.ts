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
      .from("follows")
      .select("id")
      .eq("follower_id", currentUserId)
      .eq("following_id", targetUserId)
      .maybeSingle()
      .then(({ data }) => setIsFollowing(!!data));
  }, [currentUserId, targetUserId, supabase]);

  const toggle = useCallback(async () => {
    if (!currentUserId || loading || currentUserId === targetUserId) return;
    setLoading(true);

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", targetUserId);
        if (error) throw error;
        setIsFollowing(false);
      } else {
        const { error } = await supabase.from("follows").insert({
          follower_id: currentUserId,
          following_id: targetUserId,
        });
        if (error) throw error;
        setIsFollowing(true);
      }
    } catch (e) {
      console.error("follow error", e);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, targetUserId, isFollowing, loading, supabase]);

  return { isFollowing, loading, toggle };
}
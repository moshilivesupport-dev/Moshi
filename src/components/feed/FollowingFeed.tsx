"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import HomeFeed, { type FeedItem } from "@/components/home/HomeFeed";
import Link from "next/link";

export default function FollowingFeed() {
  const supabase = createClient();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setEmpty(true);
        setLoading(false);
        return;
      }

      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const ids = (follows || []).map((f) => f.following_id);

      if (ids.length === 0) {
        setEmpty(true);
        setLoading(false);
        return;
      }

      const { data: videos } = await supabase
        .from("videos")
        .select(
          `
          id, title, description, video_url, thumbnail_url,
          duration, views_count, likes_count, comments_count,
          created_at, user_id,
          profiles:user_id (id, username, full_name, avatar_url)
        `
        )
        .in("user_id", ids)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(40);

      const feed: FeedItem[] = (videos || []).map((v: any) => ({
        id: v.id,
        type: "video" as const,
        title: v.title,
        description: v.description,
        media_url: v.video_url,
        thumbnail_url: v.thumbnail_url,
        duration: v.duration,
        views_count: v.views_count,
        likes_count: v.likes_count,
        comments_count: v.comments_count,
        created_at: v.created_at,
        user_id: v.user_id,
        profiles: v.profiles,
      }));

      setItems(feed);
      setEmpty(feed.length === 0);
      setLoading(false);
    }

    load();
  }, [supabase]);

  if (loading) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (empty) {
    return (
      <div className="h-[100dvh] bg-black flex flex-col items-center justify-center px-8 text-center">
        <p className="text-white font-semibold mb-2">Aucun contenu de vos abonnements</p>
        <p className="text-neutral-400 text-sm mb-6">
          Suivez des créateurs pour voir leurs vidéos ici.
        </p>
        <Link
          href="/search"
          className="px-6 py-2.5 rounded-full bg-red-500 text-sm font-semibold"
        >
          Trouver des créateurs
        </Link>
      </div>
    );
  }

  return <HomeFeed initialItems={items} />;
}

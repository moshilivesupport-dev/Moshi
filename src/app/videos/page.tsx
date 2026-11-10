import { createClient } from "@/lib/supabase/server";
import VideoFeed from "@/components/video/VideoFeed";
import type { VideoItem } from "@/components/video/VideoFeed";
import Link from "next/link";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VideosPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("videos")
    .select(
      `
      id,
      title,
      description,
      video_url,
      thumbnail_url,
      duration,
      views_count,
      likes_count,
      comments_count,
      created_at,
      user_id,
      profiles:user_id (
        id,
        username,
        full_name,
        avatar_url
      )
    `
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(30);

  const videos = (data || []) as unknown as VideoItem[];

  return (
    <div className="relative">
      {/* Bouton publier flottant */}
      <Link
        href="/videos/new"
        className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600 transition active:scale-95"
      >
        <Plus className="w-7 h-7" />
      </Link>

      <VideoFeed initialVideos={videos} />
    </div>
  );
}

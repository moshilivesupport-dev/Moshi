import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import VideoDetailClient from "./VideoDetailClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VideoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: video, error } = await supabase
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
    .eq("id", id)
    .single();

  if (error || !video) {
    notFound();
  }

  // Charger les commentaires
  const { data: comments } = await supabase
    .from("video_comments")
    .select(
      `
      id,
      content,
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
    .eq("video_id", id)
    .order("created_at", { ascending: true })
    .limit(50);

  // Incrémenter les vues
  await supabase.rpc("increment_video_views", { video_uuid: id });

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-black/80 backdrop-blur border-b border-neutral-800">
        <Link
          href="/videos"
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-800 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            {(video.profiles as any)?.username ||
              (video.profiles as any)?.full_name ||
              "Vidéo"}
          </p>
          <p className="text-xs text-neutral-500">
            {formatNumber(video.views_count + 1)} vues
          </p>
        </div>
      </header>

      <VideoDetailClient
        video={video as any}
        initialComments={(comments || []) as any}
      />
    </div>
  );
}

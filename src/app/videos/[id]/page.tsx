import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VideoPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: video, error } = await supabase
    .from("videos")
    .select(`
      id, url, caption, title, like_count, comment_count, view_count, user_id,
      profiles:user_id (username, full_name, avatar_url)
    `)
    .eq("id", id)
    .single();

  if (error || !video) {
    notFound();
  }

  const author = Array.isArray(video.profiles) ? video.profiles[0] : video.profiles;
  const authorName = author?.username || author?.full_name || "user";

  return (
    <div className="h-[100dvh] w-full bg-black relative overflow-hidden">
      <Link href="/" className="absolute top-4 left-4 z-30 px-4 py-2 rounded-full bg-black/50 backdrop-blur-md text-white text-sm font-medium">
        ← Retour
      </Link>

      <video
        src={video.url}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        playsInline
        controls
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

      <div className="absolute bottom-8 left-4 right-4 z-20">
        <p className="text-white font-bold text-base">@{authorName}</p>
        {(video.caption || video.title) && (
          <p className="text-white/90 text-sm mt-1">
            {video.caption || video.title}
          </p>
        )}
        <div className="flex items-center gap-4 mt-3 text-white/80 text-xs">
          <span>❤️ {video.like_count || 0}</span>
          <span>💬 {video.comment_count || 0}</span>
          <span>👁️ {video.view_count || 0}</span>
        </div>
      </div>
    </div>
  );
}
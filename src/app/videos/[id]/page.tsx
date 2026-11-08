import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: video } = await supabase
    .from("videos")
    .select("*, profiles(username, avatar_url)")
    .eq("id", id)
    .single();

  if (!video || video.status === "removed") notFound();

  const profile = video.profiles as { username?: string } | null;

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <Link
        href="/videos"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-white mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Feed
      </Link>
      <div className="rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[70vh]">
        <video
          src={video.url}
          controls
          playsInline
          className="w-full h-full object-contain"
        />
      </div>
      <div className="mt-4">
        <p className="text-sm font-semibold text-white">
          @{profile?.username ?? "user"}
        </p>
        {video.caption && (
          <p className="text-sm text-muted mt-1">{video.caption}</p>
        )}
        <p className="text-xs text-muted mt-2">
          {video.duration_seconds}s · {video.like_count} likes ·{" "}
          {video.view_count} vues
        </p>
      </div>
    </div>
  );
}

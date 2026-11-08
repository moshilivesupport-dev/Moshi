import { VideoFeed } from "@/components/video/VideoFeed";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function VideosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: videos } = await supabase
    .from("videos")
    .select("id, url, caption, duration_seconds, like_count, comment_count, view_count, profiles(username, avatar_url)")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(30);

  const mapped = (videos || []).map((v: any) => ({
    ...v,
    user: v.profiles,
  }));

  // Quelles vidéos l'utilisateur connecté a-t-il déjà aimées ?
  let likedIds: string[] = [];
  if (user && mapped.length) {
    const { data: likes } = await supabase
      .from("video_likes")
      .select("video_id")
      .eq("user_id", user.id)
      .in("video_id", mapped.map((v: any) => v.id));
    likedIds = (likes || []).map((l: any) => l.video_id);
  }

  return (
    <div className="relative">
      <VideoFeed videos={mapped} likedIds={likedIds} userId={user?.id ?? null} />
      <Link
        href="/videos/new"
        aria-label="Publier une vidéo"
        className="fixed bottom-24 md:bottom-8 right-4 z-40 w-14 h-14 rounded-full bg-coral shadow-lg shadow-coral/30 flex items-center justify-center"
      >
        <Plus className="w-7 h-7 text-white" />
      </Link>
    </div>
  );
}

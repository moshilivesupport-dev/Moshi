import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import VideoDetail from "@/components/video/VideoDetail";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VideoPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // On récupère la vidéo ET son propriétaire
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

  const { data: { user } } = await supabase.auth.getUser();

  return <VideoDetail video={video} currentUser={user} />;
}
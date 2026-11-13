import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import VideoDetailClient from "./VideoDetailClient";

export const dynamic = "force-dynamic";

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
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

  const { data: { user } } = await supabase.auth.getUser();

  return <VideoDetailClient video={video} currentUser={user} />;
}
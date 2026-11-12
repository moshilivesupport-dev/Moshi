import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VideoDetail from "@/components/video/VideoDetail";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VideoPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: video, error } = await supabase
    .from("videos")
    .select(`*, profiles:user_id (id, username, avatar_url, full_name)`)
    .eq("id", id)
    .single();

  if (error || !video) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  const videoWithProfile = {
    ...video,
    profiles: Array.isArray(video.profiles) ? video.profiles[0] : video.profiles,
  };

  return <VideoDetail video={videoWithProfile} currentUser={user} />;
}

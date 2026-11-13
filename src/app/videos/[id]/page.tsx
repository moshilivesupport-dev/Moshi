import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import VideoDetailClient from "./VideoDetailClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VideoPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // On récupère la vidéo
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

  // On récupère l'utilisateur connecté
  const { data: { user } } = await supabase.auth.getUser();

  // On affiche le composant client
  return <VideoDetailClient video={video} currentUser={user} />;
}
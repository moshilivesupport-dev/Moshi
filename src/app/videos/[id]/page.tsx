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

  // 1. Charger la vidéo côté serveur
  const { data: video, error } = await supabase
    .from("videos")
    .select(`
      id, url, caption, title, like_count, comment_count, view_count, user_id,
      profiles:user_id (username, full_name, avatar_url)
    `)
    .eq("id", id)
    .single();

  if (error || !video) {
    console.error("Erreur chargement vidéo:", error);
    notFound();
  }

  // 2. Récupérer l'utilisateur connecté (pour le bouton Like)
  const { data: { user } } = await supabase.auth.getUser();

  // 3. Passer la vidéo et l'user au composant
  return <VideoDetail video={video} currentUser={user} />;
}
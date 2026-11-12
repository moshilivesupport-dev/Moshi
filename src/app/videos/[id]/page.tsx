import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VideoDetail from "@/components/video/VideoDetail";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function VideoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Récupérer la vidéo avec les infos de l'auteur
  const { data: video } = await supabase
    .from("videos")
    .select(`
      *,
      profiles:user_id (
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (!video) {
    notFound();
  }

  // Incrémenter le compteur de vues (via RPC)
  try {
    await supabase.rpc("increment_view_count", { video_id: id });
  } catch (err) {
    // Silencieux si la RPC n'existe pas encore
  }

  // Récupérer l'utilisateur connecté
  const { data: { user } } = await supabase.auth.getUser();

  return <VideoDetail video={video} currentUser={user} />;
}

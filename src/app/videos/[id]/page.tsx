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

  // On vérifie juste que la vidéo existe
  const { data: video, error } = await supabase
    .from("videos")
    .select("id")
    .eq("id", id)
    .single();

  if (error || !video) {
    notFound();
  }

  // On passe juste l'ID au composant, qui gérera le chargement complet
  return <VideoDetail videoId={id} />;
}
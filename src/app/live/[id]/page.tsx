import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LiveRoom from "@/components/live/LiveRoom";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function LivePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Récupérer la session de live
  const { data: session } = await supabase
    .from("live_sessions")
    .select(`
      *,
      profiles:host_id (
        id,
        username,
        full_name,
        avatar_url,
        role
      )
    `)
    .eq("id", id)
    .single();

  if (!session) {
    notFound();
  }

  // Si le live est terminé, rediriger vers la page de replay (à créer plus tard)
  if (session.status === "ended") {
    redirect(`/live/${id}/replay`);
  }

  // Vérifier si l'utilisateur actuel est le host
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isHost = user?.id === session.host_id;

  // TODO: Générer le token LiveKit ici si configuré
  // const token = await generateLiveKitToken(session.room_name, user?.id, isHost);

  return (
    <LiveRoom
      sessionId={session.id}
      isHost={isHost}
      session={session}
      // token={token}
      // serverUrl={process.env.LIVEKIT_URL}
    />
  );
}

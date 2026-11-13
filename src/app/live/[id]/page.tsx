import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LiveRoom from "@/components/live/LiveRoom";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LivePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: live, error } = await supabase
    .from("live_sessions")
    .select("id, title, host_id, host_role, status, room_name, playback_url")
    .eq("id", id)
    .single();

  if (error || !live) notFound();

  // Si le live n'a pas de room_name, on en génère un (basé sur l'id du live)
  const roomName = live.room_name || `moshi-live-${live.id}`;

  return <LiveRoom liveId={live.id} roomName={roomName} />;
}
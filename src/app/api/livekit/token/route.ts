import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomName = searchParams.get("room");
  const participantName = searchParams.get("name");

  if (!roomName || !participantName) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: "Configuration LiveKit manquante" }, { status: 500 });
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: participantName,
    ttl: "2h",
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,    // Autorise la diffusion (hôte)
    canSubscribe: true,  // Autorise la réception (viewers)
    canPublishData: true,
  });

  return NextResponse.json({ token: await token.toJwt() });
}
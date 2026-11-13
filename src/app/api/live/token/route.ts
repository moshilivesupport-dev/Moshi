import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { roomName } = await req.json();

    if (!roomName) {
      return NextResponse.json({ error: "roomName manquant" }, { status: 400 });
    }

    // Vérifier que l'utilisateur est authentifié
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Récupérer son profil pour le username
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, full_name, avatar_url")
      .eq("id", user.id)
      .single();

    const identity = user.id;
    const name = profile?.full_name || profile?.username || "Utilisateur";

    // Générer le token
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY!,
      process.env.LIVEKIT_API_SECRET!,
      {
        identity,
        name,
        ttl: "2h",
        metadata: JSON.stringify({
          avatar_url: profile?.avatar_url || null,
          username: profile?.username,
        }),
      }
    );

    // Permissions : peut publier (caméra/micro) et s'abonner
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({ token });
  } catch (err) {
    console.error("Erreur token LiveKit:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
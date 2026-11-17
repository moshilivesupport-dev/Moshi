
import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const roomName = searchParams.get("room")?.trim();
    const participantName =
      searchParams.get("name")?.trim().slice(0, 50);

    // Vérification des paramètres
    if (
      !roomName ||
      !participantName ||
      !roomName.startsWith("live-")
    ) {
      return NextResponse.json(
        { error: "Paramètres de connexion invalides." },
        { status: 400 }
      );
    }

    // Récupération de l'identifiant du live
    const liveId = roomName.slice("live-".length);

    if (!liveId) {
      return NextResponse.json(
        { error: "Identifiant du live invalide." },
        { status: 400 }
      );
    }

    // Vérification de l'utilisateur connecté
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Tu dois être connecté pour rejoindre ce live." },
        { status: 401 }
      );
    }

    // Vérification de l'existence du live
    const { data: live, error: liveError } = await supabase
      .from("lives")
      .select("id, host_id, status")
      .eq("id", liveId)
      .maybeSingle();

    if (liveError) {
      console.error("Erreur vérification live :", liveError);

      return NextResponse.json(
        { error: "Impossible de vérifier ce live." },
        { status: 500 }
      );
    }

    if (!live || live.status === "ended") {
      return NextResponse.json(
        { error: "Ce live n'existe plus ou est terminé." },
        { status: 404 }
      );
    }

    // Seul l'hôte peut publier sa caméra et son micro
    const isHost = user.id === live.host_id;

    // Configuration LiveKit
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !serverUrl) {
      console.error("Configuration LiveKit incomplète.");

      return NextResponse.json(
        { error: "Configuration LiveKit manquante sur le serveur." },
        { status: 500 }
      );
    }

    // Création du jeton
    const token = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: participantName,
      ttl: "2h",
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,

      // Hôte : caméra et micro autorisés.
      // Spectateur : réception uniquement.
      canPublish: isHost,

      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await token.toJwt();

    return NextResponse.json(
      {
        token: jwt,
        roomName,
        isHost,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Erreur API LiveKit :", error);

    return NextResponse.json(
      { error: "Une erreur est survenue lors de la connexion au live." },
      { status: 500 }
    );
  }
}

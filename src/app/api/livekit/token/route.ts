
import { NextResponse } from "next/server";
import { AccessToken, TrackSource } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const roomName = searchParams.get("room")?.trim();
    const participantName = searchParams
      .get("name")
      ?.trim()
      .slice(0, 50);

    // 1. Vérifier les paramètres
    if (
      !roomName ||
      !participantName ||
      !roomName.startsWith("live-") ||
      participantName.length === 0
    ) {
      return NextResponse.json(
        { error: "Paramètres de connexion invalides." },
        { status: 400 }
      );
    }

    // 2. Récupérer l'identifiant du live
    const liveId = roomName.slice("live-".length);

    if (!liveId) {
      return NextResponse.json(
        { error: "Identifiant du live invalide." },
        { status: 400 }
      );
    }

    // 3. Vérifier l'utilisateur connecté
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

    // 4. Vérifier que le live existe
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

    if (!live || live.status !== "live") {
      return NextResponse.json(
        { error: "Ce live n'existe plus ou est terminé." },
        { status: 404 }
      );
    }

    // 5. Déterminer si l'utilisateur est l'hôte
    const isHost = user.id === live.host_id;

    // 6. Vérifier la configuration LiveKit
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

    // 7. Créer le jeton d'accès
    const token = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: participantName,
      ttl: "2h",
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: isHost,
      canSubscribe: true,
      canPublishData: true,

      ...(isHost
        ? {
            canPublishSources: [
              TrackSource.CAMERA,
              TrackSource.MICROPHONE,
              TrackSource.SCREEN_SHARE,
              TrackSource.SCREEN_SHARE_AUDIO,
            ],
          }
        : {}),
    });

    // 8. Générer le JWT
    const jwt = await token.toJwt();

    // 9. Retourner le jeton sans cache
    return NextResponse.json(
      {
        token: jwt,
        roomName,
        isHost,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  } catch (error) {
    console.error("Erreur API LiveKit :", error);

    return NextResponse.json(
      {
        error: "Une erreur est survenue lors de la connexion au live.",
      },
      { status: 500 }
    );
  }
}

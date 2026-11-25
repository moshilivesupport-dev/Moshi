
import { NextResponse } from "next/server";
import { AccessToken, TrackSource } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const room = searchParams.get("room");
    const name = searchParams.get("name");

    if (!room || !room.startsWith("live-") || !name?.trim()) {
      return NextResponse.json(
        { error: "Paramètres invalides." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentification requise." },
        { status: 401 }
      );
    }

    const liveId = room.slice("live-".length);

    if (!liveId) {
      return NextResponse.json(
        { error: "Identifiant du live invalide." },
        { status: 400 }
      );
    }

    const { data: live, error: liveError } = await supabase
      .from("lives")
      .select("id, host_id, status")
      .eq("id", liveId)
      .maybeSingle();

    if (liveError) {
      console.error("LiveKit live lookup:", liveError);

      return NextResponse.json(
        { error: "Impossible de vérifier ce live." },
        { status: 500 }
      );
    }

    if (!live || live.status !== "live") {
      return NextResponse.json(
        { error: "Ce live n'est plus disponible." },
        { status: 404 }
      );
    }

    const isHost = live.host_id === user.id;
    let isAcceptedGuest = false;

    // Un utilisateur qui n'est pas l'hôte doit avoir une invitation
    // guest acceptée pour CE live et envoyée par CET hôte.
    if (!isHost) {
      const {
        data: invitation,
        error: invitationError,
      } = await supabase
        .from("live_invitations")
        .select("id")
        .eq("live_id", live.id)
        .eq("inviter_id", live.host_id)
        .eq("invitee_id", user.id)
        .eq("invitation_type", "guest")
        .eq("status", "accepted")
        .limit(1)
        .maybeSingle();

      if (invitationError) {
        console.error("LiveKit guest invitation lookup:", invitationError);

        return NextResponse.json(
          { error: "Impossible de vérifier votre invitation." },
          { status: 500 }
        );
      }

      isAcceptedGuest = !!invitation;
    }

    // Aucun spectateur ne peut publier.
    // Seuls l'hôte et les invités acceptés peuvent publier.
    const canPublish = isHost || isAcceptedGuest;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error("Configuration LiveKit manquante.");

      return NextResponse.json(
        { error: "Configuration LiveKit manquante." },
        { status: 500 }
      );
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: name.trim().slice(0, 80),
      ttl: "2h",
    });

    token.addGrant({
      room,
      roomJoin: true,
      canPublish,
      canSubscribe: true,
      canPublishData: canPublish,
      ...(canPublish
        ? {
            canPublishSources: isHost
              ? [
                  TrackSource.CAMERA,
                  TrackSource.MICROPHONE,
                  TrackSource.SCREEN_SHARE,
                ]
              : [
                  TrackSource.CAMERA,
                  TrackSource.MICROPHONE,
                ],
          }
        : {}),
    });

    const jwt = await token.toJwt();

    return NextResponse.json(
      {
        token: jwt,
        roomName: room,
        isHost,
        isGuest: isAcceptedGuest,
        canPublish,
        livekitUrl,
        hostId: live.host_id,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("LiveKit token error:", error);

    return NextResponse.json(
      { error: "Impossible de générer le token LiveKit." },
      { status: 500 }
    );
  }
}

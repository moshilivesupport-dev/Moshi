
import { NextResponse } from "next/server";
import { AccessToken, TrackSource } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const room = searchParams.get("room");
    const name = searchParams.get("name");

    if (!room || !room.startsWith("live-") || !name) {
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

    const liveId = room.replace(/^live-/, "");

    const { data: live, error: liveError } = await supabase
      .from("lives")
      .select("id, host_id, status")
      .eq("id", liveId)
      .maybeSingle();

    if (liveError || !live || live.status !== "live") {
      return NextResponse.json(
        { error: "Ce live n'est pas disponible." },
        { status: 404 }
      );
    }

    const isHost = live.host_id === user.id;

    // Vérifier si l'utilisateur a accepté une invitation à ce live.
    let isAcceptedGuest = false;

    if (!isHost) {
      const { data: invitation, error: invitationError } = await supabase
        .from("live_invitations")
        .select("id")
        .eq("live_id", live.id)
        .eq("invitee_id", user.id)
        .eq("status", "accepted")
        .maybeSingle();

      if (invitationError) {
        return NextResponse.json(
          { error: "Impossible de vérifier votre invitation." },
          { status: 500 }
        );
      }

      isAcceptedGuest = !!invitation;
    }

    const canPublish = isHost || isAcceptedGuest;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json(
        { error: "Configuration LiveKit manquante." },
        { status: 500 }
      );
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name,
      ttl: "2h",
    });

    token.addGrant({
      room,
      roomJoin: true,
      canPublish,
      canSubscribe: true,
      canPublishData: true,
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
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
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

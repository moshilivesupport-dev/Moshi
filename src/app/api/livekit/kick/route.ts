
import { NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Vérifier l'utilisateur connecté.
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

    // 2. Lire les paramètres.
    const body = await request.json().catch(() => null);
    const liveId = body?.live_id;
    const guestId = body?.guest_id;

    if (
      typeof liveId !== "string" ||
      typeof guestId !== "string" ||
      !liveId ||
      !guestId ||
      guestId === user.id
    ) {
      return NextResponse.json(
        { error: "Paramètres invalides." },
        { status: 400 }
      );
    }

    // 3. Vérifier que l'utilisateur est bien l'hôte du live.
    const { data: live, error: liveError } = await supabase
      .from("lives")
      .select("id, host_id, status")
      .eq("id", liveId)
      .maybeSingle();

    if (liveError) {
      console.error("Erreur vérification live :", liveError);
      return NextResponse.json(
        { error: "Impossible de vérifier le live." },
        { status: 500 }
      );
    }

    if (!live || live.host_id !== user.id || live.status !== "live") {
      return NextResponse.json(
        { error: "Tu n'es pas autorisé à gérer les invités de ce live." },
        { status: 403 }
      );
    }

    // 4. Vérifier que la personne est un invité accepté de CE live.
    const { data: invitation, error: invitationError } = await supabase
      .from("live_invitations")
      .select("id")
      .eq("live_id", liveId)
      .eq("invitee_id", guestId)
      .eq("inviter_id", user.id)
      .eq("status", "accepted")
      .maybeSingle();

    if (invitationError) {
      console.error("Erreur vérification invitation :", invitationError);
      return NextResponse.json(
        { error: "Impossible de vérifier cette invitation." },
        { status: 500 }
      );
    }

    if (!invitation) {
      return NextResponse.json(
        { error: "Cet utilisateur n'est pas un invité accepté de ce live." },
        { status: 404 }
      );
    }

    // 5. Révoquer d'abord l'invitation.
    // Cela empêche l'invité d'obtenir un nouveau token de publication.
    const { data: revoked, error: revokeError } = await supabase
      .from("live_invitations")
      .update({
        status: "declined",
        responded_at: new Date().toISOString(),
      })
      .eq("id", invitation.id)
      .eq("status", "accepted")
      .select("id")
      .maybeSingle();

    if (revokeError) {
      console.error("Erreur révocation invitation :", revokeError);
      return NextResponse.json(
        { error: "Impossible de révoquer l'invitation." },
        { status: 500 }
      );
    }

    if (!revoked) {
      return NextResponse.json(
        { error: "Cette invitation a déjà été modifiée." },
        { status: 409 }
      );
    }

    // 6. Déconnecter immédiatement l'invité de LiveKit.
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error("Configuration LiveKit manquante après révocation.");
      return NextResponse.json(
        {
          error:
            "Invitation révoquée, mais la déconnexion LiveKit n'a pas pu être effectuée. Vérifie la configuration LiveKit.",
          invitationRevoked: true,
          disconnected: false,
        },
        { status: 503 }
      );
    }

    const roomService = new RoomServiceClient(
      livekitUrl,
      apiKey,
      apiSecret
    );

    try {
      await roomService.removeParticipant(`live-${liveId}`, guestId);
    } catch (kickError) {
      // La révocation est déjà faite : l'invité ne pourra pas
      // récupérer un nouveau token de publication.
      console.error("Erreur déconnexion LiveKit :", kickError);

      return NextResponse.json(
        {
          error:
            "Invitation révoquée, mais LiveKit n'a pas confirmé la déconnexion.",
          invitationRevoked: true,
          disconnected: false,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      invitationRevoked: true,
      disconnected: true,
      message: "L'invité a été retiré du live.",
    });
  } catch (error) {
    console.error("LiveKit kick error :", error);

    return NextResponse.json(
      { error: "Une erreur est survenue lors du retrait de l'invité." },
      { status: 500 }
    );
  }
}

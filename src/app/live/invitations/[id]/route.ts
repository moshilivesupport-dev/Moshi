
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Tu dois être connecté." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);
    const status = body?.status;

    if (
      typeof id !== "string" ||
      !id ||
      !["accepted", "declined"].includes(status)
    ) {
      return NextResponse.json(
        { error: "Réponse invalide." },
        { status: 400 }
      );
    }

    // Vérifier que l'invitation appartient bien à l'utilisateur
    // et qu'elle est encore en attente.
    const { data: invitation, error: lookupError } = await supabase
      .from("live_invitations")
      .select(
        "id, live_id, inviter_id, invitee_id, invitation_type, status"
      )
      .eq("id", id)
      .eq("invitee_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (lookupError) {
      console.error("Invitation lookup error:", lookupError);

      return NextResponse.json(
        { error: "Impossible de vérifier cette invitation." },
        { status: 500 }
      );
    }

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation introuvable ou déjà traitée." },
        { status: 404 }
      );
    }

    // Refuser une invitation : même traitement pour guest et match.
    if (status === "declined") {
      const { data: declined, error } = await supabase
        .from("live_invitations")
        .update({
          status: "declined",
          responded_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("invitee_id", user.id)
        .eq("status", "pending")
        .select()
        .maybeSingle();

      if (error) {
        console.error("Invitation decline error:", error);

        return NextResponse.json(
          { error: "Impossible de refuser cette invitation." },
          { status: 500 }
        );
      }

      if (!declined) {
        return NextResponse.json(
          { error: "Cette invitation a déjà été traitée." },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        invitation: declined,
      });
    }

    // Vérifier que le live est toujours actif et que l'inviteur
    // est toujours bien l'hôte de ce live.
    const { data: live, error: liveError } = await supabase
      .from("lives")
      .select("id, status, host_id")
      .eq("id", invitation.live_id)
      .maybeSingle();

    if (liveError) {
      console.error("Live lookup error:", liveError);

      return NextResponse.json(
        { error: "Impossible de vérifier le live." },
        { status: 500 }
      );
    }

    if (
      !live ||
      live.status !== "live" ||
      live.host_id !== invitation.inviter_id
    ) {
      return NextResponse.json(
        { error: "Ce live n'est plus disponible." },
        { status: 409 }
      );
    }

    // INVITATION GUEST :
    // Utiliser la fonction SQL atomique qui verrouille le live
    // et limite le nombre d'invités acceptés à 4.
    if (invitation.invitation_type === "guest") {
      const { data: result, error: acceptError } = await supabase.rpc(
        "accept_live_invitation",
        {
          p_invitation_id: id,
          p_max_guests: 4,
        }
      );

      if (acceptError) {
        console.error("Invitation acceptance RPC error:", acceptError);

        return NextResponse.json(
          { error: "Impossible d'accepter cette invitation." },
          { status: 500 }
        );
      }

      // La fonction SQL retourne "ok" et "code",
      // et non "success" et "error".
      if (!result?.ok) {
        const code = result?.code;

        if (code === "guest_limit_reached") {
          return NextResponse.json(
            {
              error: "Ce live a déjà atteint sa limite de 4 invités.",
              code,
            },
            { status: 409 }
          );
        }

        if (code === "live_unavailable") {
          return NextResponse.json(
            { error: "Ce live n'est plus disponible.", code },
            { status: 409 }
          );
        }

        if (
          code === "not_found" ||
          code === "already_processed"
        ) {
          return NextResponse.json(
            {
              error: "Cette invitation est introuvable ou déjà traitée.",
              code,
            },
            { status: 404 }
          );
        }

        if (code === "wrong_invitation_type") {
          return NextResponse.json(
            {
              error: "Cette invitation n'est pas une invitation d'invité.",
              code,
            },
            { status: 409 }
          );
        }

        return NextResponse.json(
          {
            error: "L'invitation n'a pas pu être acceptée.",
            code: code || "acceptance_failed",
          },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        invitation: result.invitation,
        guest_count: result.guest_count,
        guest_limit: result.guest_limit,
      });
    }

    // INVITATION MATCH :
    // Elle conserve son traitement direct.
    // La fonction SQL accept_live_invitation est réservée aux guests.
    if (invitation.invitation_type === "match") {
      const { data: accepted, error: acceptError } = await supabase
        .from("live_invitations")
        .update({
          status: "accepted",
          responded_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("invitee_id", user.id)
        .eq("invitation_type", "match")
        .eq("status", "pending")
        .select()
        .maybeSingle();

      if (acceptError) {
        console.error("Match invitation acceptance error:", acceptError);

        return NextResponse.json(
          { error: "Impossible d'accepter cette invitation de match." },
          { status: 500 }
        );
      }

      if (!accepted) {
        return NextResponse.json(
          { error: "Cette invitation a déjà été traitée." },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        invitation: accepted,
      });
    }

    return NextResponse.json(
      { error: "Type d'invitation non reconnu." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Invitation response API error:", error);

    return NextResponse.json(
      { error: "Une erreur est survenue." },
      { status: 500 }
    );
  }
}

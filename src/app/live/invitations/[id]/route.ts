
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

    // Vérifier que l'invitation appartient bien à l'utilisateur.
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

    // Refuser une invitation.
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

      return NextResponse.json({ invitation: declined });
    }

    // Vérifier que le live est toujours actif.
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

    // L'acceptation passe par la fonction SQL atomique.
    // Elle verrouille le live et contrôle la limite côté serveur.
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

    if (!result?.success) {
      const code = result?.error;

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
          { error: "Cette invitation est introuvable ou déjà traitée.", code },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: "L'invitation n'a pas pu être acceptée.", code },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation: result.invitation ?? {
        id,
        live_id: invitation.live_id,
        inviter_id: invitation.inviter_id,
        invitee_id: invitation.invitee_id,
        status: "accepted",
      },
    });
  } catch (error) {
    console.error("Invitation response API error:", error);

    return NextResponse.json(
      { error: "Une erreur est survenue." },
      { status: 500 }
    );
  }
}

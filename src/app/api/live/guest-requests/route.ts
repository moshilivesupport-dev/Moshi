
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = {
  liveId?: string;
  requestId?: string;
  action?: "accept" | "decline";
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { supabase, user: null };
  return { supabase, user };
}

// POST : un spectateur demande à rejoindre le live.
export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedClient();

    if (!user) return jsonError("Connexion requise.", 401);

    const body = (await request.json()) as RequestBody;
    const liveId = body.liveId?.trim();

    if (!liveId) return jsonError("Identifiant du live manquant.");

    const { data: live, error: liveError } = await supabase
      .from("lives")
      .select("id, host_id, status")
      .eq("id", liveId)
      .maybeSingle();

    if (liveError) {
      console.error("Guest request live lookup:", liveError);
      return jsonError("Impossible de vérifier ce live.", 500);
    }

    if (!live || live.status !== "live") {
      return jsonError("Ce live n'est plus disponible.", 404);
    }

    if (live.host_id === user.id) {
      return jsonError("L'hôte ne peut pas demander à rejoindre son propre live.");
    }

    const { data: existing, error: existingError } = await supabase
      .from("live_guest_requests")
      .select("id, status")
      .eq("live_id", live.id)
      .eq("requester_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingError) {
      console.error("Guest request lookup:", existingError);
      return jsonError("Impossible de vérifier votre demande.", 500);
    }

    if (existing) {
      return NextResponse.json({
        success: true,
        request: existing,
        alreadyPending: true,
      });
    }

    const { data: created, error: insertError } = await supabase
      .from("live_guest_requests")
      .insert({
        live_id: live.id,
        host_id: live.host_id,
        requester_id: user.id,
        status: "pending",
      })
      .select("id, live_id, status, created_at")
      .single();

    if (insertError) {
      // Une autre requête peut avoir été envoyée au même moment.
      if (insertError.code === "23505") {
        return NextResponse.json({
          success: true,
          alreadyPending: true,
        });
      }

      console.error("Guest request insert:", insertError);
      return jsonError("Impossible d'envoyer la demande.", 500);
    }

    return NextResponse.json({ success: true, request: created });
  } catch (error) {
    console.error("POST guest request:", error);
    return jsonError("Erreur interne lors de l'envoi de la demande.", 500);
  }
}

// GET : l'hôte récupère les demandes en attente de son live.
export async function GET(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedClient();

    if (!user) return jsonError("Connexion requise.", 401);

    const { searchParams } = new URL(request.url);
    const liveId = searchParams.get("liveId")?.trim();

    if (!liveId) return jsonError("Identifiant du live manquant.");

    const { data: live, error: liveError } = await supabase
      .from("lives")
      .select("id, host_id, status")
      .eq("id", liveId)
      .maybeSingle();

    if (liveError || !live) {
      return jsonError("Live introuvable.", 404);
    }

    if (live.host_id !== user.id) {
      return jsonError("Seul l'hôte peut consulter ces demandes.", 403);
    }

    const { data: requests, error: requestsError } = await supabase
      .from("live_guest_requests")
      .select("id, live_id, requester_id, status, created_at")
      .eq("live_id", live.id)
      .eq("host_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (requestsError) {
      console.error("Guest requests list:", requestsError);
      return jsonError("Impossible de charger les demandes.", 500);
    }

    const requesterIds = [
      ...new Set((requests || []).map((item) => item.requester_id)),
    ];

    let profiles: Array<{
      id: string;
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
    }> = [];

    if (requesterIds.length) {
      const { data, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", requesterIds);

      if (profilesError) {
        console.error("Guest request profiles:", profilesError);
        return jsonError("Impossible de charger les profils.", 500);
      }

      profiles = data || [];
    }

    const result = (requests || []).map((item) => ({
      ...item,
      profile:
        profiles.find((profile) => profile.id === item.requester_id) || null,
    }));

    return NextResponse.json({ requests: result });
  } catch (error) {
    console.error("GET guest requests:", error);
    return jsonError("Erreur interne lors du chargement des demandes.", 500);
  }
}

// PATCH : l'hôte accepte ou refuse une demande.
export async function PATCH(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedClient();

    if (!user) return jsonError("Connexion requise.", 401);

    const body = (await request.json()) as RequestBody;
    const requestId = body.requestId?.trim();
    const action = body.action;

    if (!requestId || !["accept", "decline"].includes(action || "")) {
      return jsonError("Demande ou action invalide.");
    }

    const { data: guestRequest, error: requestError } = await supabase
      .from("live_guest_requests")
      .select("id, live_id, host_id, requester_id, status")
      .eq("id", requestId)
      .maybeSingle();

    if (requestError || !guestRequest) {
      return jsonError("Demande introuvable.", 404);
    }

    if (guestRequest.host_id !== user.id) {
      return jsonError("Seul l'hôte peut répondre à cette demande.", 403);
    }

    if (guestRequest.status !== "pending") {
      return jsonError("Cette demande a déjà été traitée.", 409);
    }

    const { data: live, error: liveError } = await supabase
      .from("lives")
      .select("id, host_id, status")
      .eq("id", guestRequest.live_id)
      .maybeSingle();

    if (liveError || !live || live.host_id !== user.id || live.status !== "live") {
      return jsonError("Ce live n'est plus disponible.", 409);
    }

    if (action === "decline") {
      const { data: updated, error: updateError } = await supabase
        .from("live_guest_requests")
        .update({
          status: "declined",
          responded_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("host_id", user.id)
        .eq("status", "pending")
        .select("id, status")
        .maybeSingle();

      if (updateError || !updated) {
        return jsonError("La demande n'a pas pu être refusée.", 409);
      }

      return NextResponse.json({ success: true, status: "declined" });
    }

    // Évite de créer une seconde invitation si une invitation guest existe déjà.
    const { data: existingInvitation, error: invitationLookupError } =
      await supabase
        .from("live_invitations")
        .select("id, status")
        .eq("live_id", guestRequest.live_id)
        .eq("inviter_id", user.id)
        .eq("invitee_id", guestRequest.requester_id)
        .eq("invitation_type", "guest")
        .maybeSingle();

    if (invitationLookupError) {
      console.error("Guest invitation lookup:", invitationLookupError);
      return jsonError("Impossible de vérifier l'invitation.", 500);
    }

    let invitation = existingInvitation;

    if (!invitation) {
      const { data: createdInvitation, error: createInvitationError } =
        await supabase
          .from("live_invitations")
          .insert({
            live_id: guestRequest.live_id,
            inviter_id: user.id,
            invitee_id: guestRequest.requester_id,
            invitation_type: "guest",
            status: "pending",
          })
          .select("id, status")
          .single();

      if (createInvitationError || !createdInvitation) {
        console.error("Create guest invitation:", createInvitationError);
        return jsonError("Impossible de créer l'invitation.", 500);
      }

      invitation = createdInvitation;
    }

    const { data: updatedRequest, error: updateRequestError } = await supabase
      .from("live_guest_requests")
      .update({
        status: "accepted",
        responded_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .eq("host_id", user.id)
      .eq("status", "pending")
      .select("id, status")
      .maybeSingle();

    if (updateRequestError || !updatedRequest) {
      console.error("Update accepted guest request:", updateRequestError);
      return jsonError(
        "L'invitation a été créée, mais la demande n'a pas pu être finalisée. Actualise la liste.",
        409
      );
    }

    return NextResponse.json({
      success: true,
      status: "accepted",
      invitation,
    });
  } catch (error) {
    console.error("PATCH guest request:", error);
    return jsonError("Erreur interne lors du traitement de la demande.", 500);
  }
}

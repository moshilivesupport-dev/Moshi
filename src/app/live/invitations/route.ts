
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Tu dois être connecté." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { live_id, invitee_id } = body;

    if (
      typeof live_id !== "string" ||
      typeof invitee_id !== "string" ||
      !live_id ||
      !invitee_id
    ) {
      return NextResponse.json(
        { error: "Informations d'invitation invalides." },
        { status: 400 }
      );
    }

    if (invitee_id === user.id) {
      return NextResponse.json(
        { error: "Tu ne peux pas t'inviter toi-même." },
        { status: 400 }
      );
    }

    // Vérifier que le live existe et est toujours actif.
    const { data: live, error: liveError } = await supabase
      .from("lives")
      .select("id, host_id, status")
      .eq("id", live_id)
      .maybeSingle();

    if (liveError || !live || live.status !== "live") {
      return NextResponse.json(
        { error: "Ce live n'est pas disponible." },
        { status: 404 }
      );
    }

    if (live.host_id !== user.id) {
      return NextResponse.json(
        { error: "Seul l'hôte peut envoyer une invitation." },
        { status: 403 }
      );
    }

    // Éviter les invitations en double.
    const { data: existing } = await supabase
      .from("live_invitations")
      .select("id, status")
      .eq("live_id", live_id)
      .eq("invitee_id", invitee_id)
      .in("status", ["pending", "accepted"])
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Cet utilisateur possède déjà une invitation active." },
        { status: 409 }
      );
    }

    const { data: invitation, error } = await supabase
      .from("live_invitations")
      .insert({
        live_id,
        inviter_id: user.id,
        invitee_id,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Invitation error:", error);
      return NextResponse.json(
        { error: "Impossible d'envoyer l'invitation." },
        { status: 500 }
      );
    }

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    console.error("Invitation API error:", error);

    return NextResponse.json(
      { error: "Une erreur est survenue." },
      { status: 500 }
    );
  }
}

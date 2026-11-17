
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const status = body.status;

    if (!["accepted", "declined"].includes(status)) {
      return NextResponse.json(
        { error: "Réponse invalide." },
        { status: 400 }
      );
    }

    const { data: invitation, error } = await supabase
      .from("live_invitations")
      .update({
        status,
        responded_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("invitee_id", user.id)
      .eq("status", "pending")
      .select()
      .maybeSingle();

    if (error) {
      console.error("Invitation response error:", error);

      return NextResponse.json(
        { error: "Impossible de répondre à l'invitation." },
        { status: 500 }
      );
    }

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation introuvable ou déjà traitée." },
        { status: 404 }
      );
    }

    return NextResponse.json({ invitation });
  } catch (error) {
    console.error("Invitation response API error:", error);

    return NextResponse.json(
      { error: "Une erreur est survenue." },
      { status: 500 }
    );
  }
}

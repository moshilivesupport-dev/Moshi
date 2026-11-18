
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // Vérifier les droits de l'administrateur connecté.
    const auth = await requireAdmin();

    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();

    const requestId =
      typeof body.requestId === "string"
        ? body.requestId.trim()
        : "";

    const decision =
      typeof body.decision === "string"
        ? body.decision.trim()
        : "";

    const adminNote =
      typeof body.adminNote === "string"
        ? body.adminNote.trim()
        : null;

    // Vérifier l'identifiant UUID.
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(requestId)) {
      return NextResponse.json(
        { error: "Identifiant de demande invalide." },
        { status: 400 }
      );
    }

    if (!["approved", "rejected", "in_progress"].includes(decision)) {
      return NextResponse.json(
        { error: "Décision invalide." },
        { status: 400 }
      );
    }

    if (adminNote && adminNote.length > 1000) {
      return NextResponse.json(
        { error: "La réponse ne doit pas dépasser 1000 caractères." },
        { status: 400 }
      );
    }

    // Appeler la fonction SQL avec l'identifiant réel de l'administrateur.
    const { data, error } = await auth.adminClient.rpc(
      "review_country_change_request",
      {
        p_ticket_id: requestId,
        p_admin_id: auth.user.id,
        p_decision: decision,
        p_admin_note: adminNote || null,
      }
    );

    if (error) {
      console.error("Erreur traitement changement de pays:", error);

      return NextResponse.json(
        {
          error:
            error.message ||
            "Impossible de traiter cette demande.",
        },
        { status: 400 }
      );
    }

    const messages: Record<string, string> = {
      approved: "Demande approuvée. Le pays du compte a été modifié.",
      rejected: "Demande de changement de pays refusée.",
      in_progress: "Demande mise en cours de traitement.",
    };

    return NextResponse.json(
      {
        success: true,
        result: data,
        message: messages[decision],
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Country change review API error:", error);

    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}

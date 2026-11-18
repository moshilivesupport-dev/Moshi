
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // Vérifier que la personne connectée est administrateur
    const auth = await requireAdmin();

    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    // Lire les informations envoyées par l'interface
    const body = await request.json();

    const requestId =
      typeof body.requestId === "string" ? body.requestId : "";

    const decision =
      typeof body.decision === "string" ? body.decision : "";

    const adminNote =
      typeof body.adminNote === "string"
        ? body.adminNote.trim()
        : null;

    if (!requestId) {
      return NextResponse.json(
        { error: "Identifiant de demande manquant." },
        { status: 400 }
      );
    }

    if (!["approved", "rejected"].includes(decision)) {
      return NextResponse.json(
        { error: "Décision invalide." },
        { status: 400 }
      );
    }

    if (adminNote && adminNote.length > 1000) {
      return NextResponse.json(
        { error: "La note ne doit pas dépasser 1000 caractères." },
        { status: 400 }
      );
    }

    // Exécuter la fonction SQL avec le client administrateur
    const { data, error } = await auth.adminClient.rpc(
      "review_verification_request",
      {
        p_request_id: requestId,
        p_decision: decision,
        p_admin_note: adminNote || null,
      }
    );

    if (error) {
      console.error("Erreur traitement certification:", error);

      return NextResponse.json(
        {
          error:
            error.message ||
            "Impossible de traiter cette demande.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        result: data,
        message:
          decision === "approved"
            ? "Certification approuvée."
            : "Demande de certification refusée.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Admin review API error:", error);

    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}

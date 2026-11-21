
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
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
        : "";

    const UUID_PATTERN =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!UUID_PATTERN.test(requestId)) {
      return NextResponse.json(
        { error: "Identifiant de demande invalide." },
        { status: 400 }
      );
    }

    if (!["approved", "rejected"].includes(decision)) {
      return NextResponse.json(
        { error: "Décision invalide." },
        { status: 400 }
      );
    }

    if (adminNote.length > 1000) {
      return NextResponse.json(
        { error: "La note ne doit pas dépasser 1000 caractères." },
        { status: 400 }
      );
    }

    const { data, error } = await auth.adminClient.rpc(
      "review_verification_request",
      {
        p_request_id: requestId,
        p_decision: decision,
        p_admin_note: adminNote || null,
        p_admin_user_id: auth.user.id,
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
            ? "Certification approuvée et journalisée."
            : "Demande refusée et décision journalisée.",
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


import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Decision = "approved" | "rejected";

export async function POST(request: Request) {
  let auth:
    | Awaited<ReturnType<typeof requireAdmin>>
    | null = null;

  let previousRequest:
    | {
        id: string;
        user_id: string;
        status: string;
        admin_note: string | null;
        notes: string | null;
      }
    | null = null;

  let previousVerified: boolean | null = null;
  let requestUpdated = false;
  let profileUpdated = false;

  try {
    auth = await requireAdmin();

    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json().catch(() => null);

    const requestId =
      typeof body?.requestId === "string"
        ? body.requestId.trim()
        : "";

    const decision =
      typeof body?.decision === "string"
        ? body.decision.trim()
        : "";

    const adminNote =
      typeof body?.adminNote === "string"
        ? body.adminNote.trim()
        : "";

    if (!UUID_PATTERN.test(requestId)) {
      return NextResponse.json(
        { error: "Identifiant de demande invalide." },
        { status: 400 }
      );
    }

    if (
      decision !== "approved" &&
      decision !== "rejected"
    ) {
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

    const adminClient = auth.adminClient;

    const { data: verification, error: readError } =
      await adminClient
        .from("verification_requests")
        .select(
          "id, user_id, status, admin_note, notes"
        )
        .eq("id", requestId)
        .maybeSingle();

    if (readError) {
      console.error("Lecture certification :", readError);

      return NextResponse.json(
        { error: "Impossible de récupérer cette demande." },
        { status: 500 }
      );
    }

    if (!verification) {
      return NextResponse.json(
        { error: "Demande de certification introuvable." },
        { status: 404 }
      );
    }

    if (verification.status !== "pending") {
      return NextResponse.json(
        {
          error:
            "Cette demande a déjà été traitée. Actualise la page.",
        },
        { status: 409 }
      );
    }

    previousRequest = verification;

    if (decision === "approved") {
      const { data: profile, error: profileReadError } =
        await adminClient
          .from("profiles")
          .select("id, is_verified")
          .eq("id", verification.user_id)
          .maybeSingle();

      if (profileReadError || !profile) {
        console.error(
          "Lecture profil certification :",
          profileReadError
        );

        return NextResponse.json(
          { error: "Impossible de récupérer le profil concerné." },
          { status: 500 }
        );
      }

      previousVerified = profile.is_verified;

      const { data: updatedProfile, error: profileError } =
        await adminClient
          .from("profiles")
          .update({
            is_verified: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", verification.user_id)
          .select("id")
          .maybeSingle();

      if (profileError || !updatedProfile) {
        console.error(
          "Approbation profil certification :",
          profileError
        );

        return NextResponse.json(
          { error: "Impossible de certifier ce compte." },
          { status: 500 }
        );
      }

      profileUpdated = true;
    }

    const { data: updatedRequest, error: updateError } =
      await adminClient
        .from("verification_requests")
        .update({
          status: decision,
          admin_note: adminNote || null,
          notes: adminNote || null,
          reviewed_by: auth.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("status", "pending")
        .select("id, status")
        .maybeSingle();

    if (updateError || !updatedRequest) {
      console.error(
        "Mise à jour demande certification :",
        updateError
      );

      if (profileUpdated && previousVerified !== null) {
        await adminClient
          .from("profiles")
          .update({
            is_verified: previousVerified,
            updated_at: new Date().toISOString(),
          })
          .eq("id", verification.user_id);
      }

      return NextResponse.json(
        {
          error:
            "La demande n'a pas pu être mise à jour. Réessaie.",
        },
        { status: 500 }
      );
    }

    requestUpdated = true;

    const { error: logError } = await adminClient
      .from("admin_activity_logs")
      .insert({
        admin_id: auth.user.id,
        action:
          decision === "approved"
            ? "verification_approved"
            : "verification_rejected",
        target_type: "verification_request",
        target_id: requestId,
        details: {
          user_id: verification.user_id,
          decision,
          admin_note: adminNote || null,
        },
      });

    if (logError) {
      console.error(
        "Journalisation certification :",
        logError
      );

      if (requestUpdated && previousRequest) {
        await adminClient
          .from("verification_requests")
          .update({
            status: previousRequest.status,
            admin_note: previousRequest.admin_note,
            notes: previousRequest.notes,
            reviewed_by: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", requestId);
      }

      if (profileUpdated && previousVerified !== null) {
        await adminClient
          .from("profiles")
          .update({
            is_verified: previousVerified,
            updated_at: new Date().toISOString(),
          })
          .eq("id", verification.user_id);
      }

      return NextResponse.json(
        {
          error:
            "La décision n'a pas été enregistrée dans le journal administratif.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        result: updatedRequest,
        message:
          decision === "approved"
            ? "Certification approuvée et profil certifié."
            : "Demande refusée et décision journalisée.",
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Admin verification review error:", error);

    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { data: requests, error } = await auth.adminClient
      .from("verification_requests")
      .select(`
        id,
        user_id,
        account_type,
        status,
        id_document_path,
        selfie_path,
        business_document_path,
        admin_note,
        created_at
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error(
        "Erreur demandes de certification:",
        error
      );

      return NextResponse.json(
        { error: "Impossible de récupérer les demandes." },
        { status: 500 }
      );
    }

    const results = (requests ?? []).map((request) => ({
      id: request.id,
      user_id: request.user_id,
      account_type: request.account_type,
      status: request.status,
      admin_note: request.admin_note,
      created_at: request.created_at,
      documents: {
        identity: Boolean(request.id_document_path),
        selfie: Boolean(request.selfie_path),
        business: Boolean(request.business_document_path),
      },
    }));

    return NextResponse.json(
      { requests: results },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "Admin verifications GET error:",
      error
    );

    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}

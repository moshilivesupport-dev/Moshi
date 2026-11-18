
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const BUCKET = "verification-documents";
const SIGNED_URL_SECONDS = 10 * 60;

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
      console.error("Erreur demandes de certification:", error);

      return NextResponse.json(
        { error: "Impossible de récupérer les demandes." },
        { status: 500 }
      );
    }

    const results = await Promise.all(
      (requests ?? []).map(async (request) => {
        const paths = [
          request.id_document_path,
          request.selfie_path,
          request.business_document_path,
        ].filter((path): path is string => Boolean(path));

        const signedResults = await Promise.all(
          paths.map((path) =>
            auth.adminClient.storage
              .from(BUCKET)
              .createSignedUrl(path, SIGNED_URL_SECONDS)
          )
        );

        const urls = new Map<string, string>();

        for (let index = 0; index < paths.length; index++) {
          const result = signedResults[index];

          if (result.error || !result.data?.signedUrl) {
            console.error(
              "Impossible de générer un lien temporaire:",
              result.error
            );
            continue;
          }

          urls.set(paths[index], result.data.signedUrl);
        }

        return {
          id: request.id,
          user_id: request.user_id,
          account_type: request.account_type,
          status: request.status,
          admin_note: request.admin_note,
          created_at: request.created_at,
          documents: {
            identity: urls.get(request.id_document_path) ?? null,
            selfie: urls.get(request.selfie_path) ?? null,
            business: request.business_document_path
              ? urls.get(request.business_document_path) ?? null
              : null,
          },
        };
      })
    );

    return NextResponse.json(
      { requests: results },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error("Admin verifications GET error:", error);

    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}

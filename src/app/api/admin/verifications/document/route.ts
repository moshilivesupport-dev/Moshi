
import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DocumentKind = "identity" | "selfie" | "business";

interface R2ObjectBody {
  body: ReadableStream;
  httpMetadata?: {
    contentType?: string;
  };
}

interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
}

function isDocumentKind(value: string): value is DocumentKind {
  return (
    value === "identity" ||
    value === "selfie" ||
    value === "business"
  );
}

function getContentType(key: string, storedType?: string) {
  if (storedType) {
    const normalized = storedType.split(";")[0].trim().toLowerCase();

    if (
      normalized === "image/jpeg" ||
      normalized === "image/png" ||
      normalized === "image/webp" ||
      normalized === "application/pdf"
    ) {
      return normalized;
    }
  }

  const extension = key.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const requestId = request.nextUrl.searchParams.get("requestId");
    const kindValue = request.nextUrl.searchParams.get("kind");

    if (!requestId || !kindValue || !isDocumentKind(kindValue)) {
      return NextResponse.json(
        { error: "Paramètres de document invalides." },
        { status: 400 }
      );
    }

    const { data: verification, error: verificationError } =
      await auth.adminClient
        .from("verification_requests")
        .select(
          "id, user_id, id_document_path, selfie_path, business_document_path"
        )
        .eq("id", requestId)
        .maybeSingle();

    if (verificationError) {
      console.error(
        "Erreur lecture demande certification:",
        verificationError
      );

      return NextResponse.json(
        { error: "Impossible de récupérer la demande." },
        { status: 500 }
      );
    }

    if (!verification) {
      return NextResponse.json(
        { error: "Demande introuvable." },
        { status: 404 }
      );
    }

    const key =
      kindValue === "identity"
        ? verification.id_document_path
        : kindValue === "selfie"
          ? verification.selfie_path
          : verification.business_document_path;

    if (!key) {
      return NextResponse.json(
        { error: "Ce document n'est pas disponible." },
        { status: 404 }
      );
    }

    const expectedPrefix =
      `verification-documents/${verification.user_id}/`;

    if (
      typeof key !== "string" ||
      !key.startsWith(expectedPrefix) ||
      !/^[a-f0-9-]{36}\.(jpg|png|webp|pdf)$/i.test(
        key.slice(expectedPrefix.length)
      )
    ) {
      console.error("Clé R2 de certification invalide:", key);

      return NextResponse.json(
        { error: "Référence de document invalide." },
        { status: 400 }
      );
    }

    const context = await getCloudflareContext({ async: true });

    const env = context.env as unknown as {
      MOSHI_MEDIA?: R2Bucket;
    };

    if (!env.MOSHI_MEDIA) {
      throw new Error("Le bucket R2 MOSHI_MEDIA est indisponible.");
    }

    const object = await env.MOSHI_MEDIA.get(key);

    if (!object) {
      return NextResponse.json(
        { error: "Fichier absent du stockage R2." },
        { status: 404 }
      );
    }

    const contentType = getContentType(
      key,
      object.httpMetadata?.contentType
    );

    const filename = `${kindValue}-${verification.id}.${contentType === "application/pdf" ? "pdf" : contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg"}`;

    return new NextResponse(object.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    console.error(
      "Admin verification document error:",
      error instanceof Error ? error.message : "Erreur inconnue"
    );

    return NextResponse.json(
      { error: "Impossible de consulter ce document." },
      { status: 500 }
    );
  }
}

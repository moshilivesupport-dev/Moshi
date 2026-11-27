
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DocumentKind = "identity" | "selfie" | "business";

interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer,
    options?: {
      httpMetadata?: {
        contentType?: string;
        cacheControl?: string;
      };
      customMetadata?: Record<string, string>;
    }
  ): Promise<unknown>;

  delete(key: string): Promise<void>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isDocumentKind(value: string): value is DocumentKind {
  return (
    value === "identity" ||
    value === "selfie" ||
    value === "business"
  );
}

async function getBucket(): Promise<R2Bucket> {
  const context = await getCloudflareContext({ async: true });

  const env = context.env as unknown as {
    MOSHI_MEDIA?: R2Bucket;
  };

  if (!env.MOSHI_MEDIA) {
    throw new Error("Le stockage R2 MOSHI_MEDIA est indisponible.");
  }

  return env.MOSHI_MEDIA;
}

async function authenticate(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();

  if (!token) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Configuration Supabase manquante.");
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;

  return user;
}

function isOwnedDocumentKey(key: string, userId: string) {
  const prefix = `verification-documents/${userId}/`;

  if (!key.startsWith(prefix)) return false;

  const filename = key.slice(prefix.length);

  return /^[a-f0-9-]{36}\.(jpg|png|webp|pdf)$/i.test(filename);
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);

    if (!user) {
      return jsonError("Session invalide. Reconnecte-toi.", 401);
    }

    const formData = await request.formData();

    const file = formData.get("file");
    const kindValue = formData.get("kind");

    if (!(file instanceof File)) {
      return jsonError("Document manquant.");
    }

    if (
      typeof kindValue !== "string" ||
      !isDocumentKind(kindValue)
    ) {
      return jsonError("Type de document invalide.");
    }

    const kind = kindValue;
    const mimeType = file.type.split(";")[0].trim().toLowerCase();

    const extension = ALLOWED_TYPES[mimeType];

    if (!extension) {
      return jsonError("Format non accepté. Utilise JPG, PNG, WEBP ou PDF.");
    }

    if (kind === "selfie" && mimeType === "application/pdf") {
      return jsonError("Le selfie doit être une image.");
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return jsonError("Chaque document doit faire moins de 5 Mo.");
    }

    const key =
      `verification-documents/${user.id}/${crypto.randomUUID()}.${extension}`;

    const bucket = await getBucket();

    await bucket.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: mimeType,
        cacheControl: "private, no-store, max-age=0",
      },
      customMetadata: {
        owner: user.id,
        documentKind: kind,
      },
    });

    return NextResponse.json(
      {
        success: true,
        key,
        kind,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Erreur upload document certification:",
      error instanceof Error ? error.message : "Erreur inconnue"
    );

    return jsonError(
      "Impossible d'envoyer le document vers le stockage privé.",
      500
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticate(request);

    if (!user) {
      return jsonError("Session invalide. Reconnecte-toi.", 401);
    }

    const key = request.nextUrl.searchParams.get("key");

    if (!key || !isOwnedDocumentKey(key, user.id)) {
      return jsonError("Document invalide ou accès interdit.", 403);
    }

    const bucket = await getBucket();

    await bucket.delete(key);

    return NextResponse.json(
      { success: true },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Erreur suppression document certification:",
      error instanceof Error ? error.message : "Erreur inconnue"
    );

    return jsonError("Impossible de supprimer le document.", 500);
  }
}

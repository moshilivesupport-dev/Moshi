
import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MediaCategory = "avatars" | "stories" | "products";

type R2Object = {
  size: number;
  httpEtag?: string;
  httpMetadata?: {
    contentType?: string;
    cacheControl?: string;
  };
  body: ReadableStream<Uint8Array>;
};

type R2Bucket = {
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

  get(
    key: string,
    options?: {
      range?: {
        offset: number;
        length: number;
      };
    }
  ): Promise<R2Object | null>;

  delete(key: string): Promise<void>;
};

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const STORY_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

const LIMITS: Record<MediaCategory, number> = {
  avatars: 5 * 1024 * 1024,
  products: 5 * 1024 * 1024,
  stories: 30 * 1024 * 1024,
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function getBucket(): Promise<R2Bucket> {
  const context = await getCloudflareContext({ async: true });

  const bucket = (
    context.env as unknown as {
      MOSHI_MEDIA?: R2Bucket;
    }
  ).MOSHI_MEDIA;

  if (!bucket) {
    throw new Error("Le bucket R2 MOSHI_MEDIA est indisponible.");
  }

  return bucket;
}

async function authenticate(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();

  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Configuration Supabase manquante.");
  }

  const supabase = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) return null;

  return data.user;
}

function validCategory(value: string): value is MediaCategory {
  return (
    value === "avatars" ||
    value === "stories" ||
    value === "products"
  );
}

function extensionForMime(mime: string): string | null {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };

  return extensions[mime] ?? null;
}

function validKey(key: string): boolean {
  if (!key || key.length > 1024) return false;
  if (key.startsWith("/") || key.includes("..")) return false;
  if (key.includes("\\") || key.includes("\0")) return false;

  const parts = key.split("/");

  if (parts.length !== 3) return false;

  const [category, userId, filename] = parts;

  if (!validCategory(category)) return false;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      userId
    )
  ) {
    return false;
  }

  return /^[a-zA-Z0-9._-]+$/.test(filename);
}

function parseRange(
  header: string | null,
  size: number
):
  | { offset: number; length: number; end: number }
  | null
  | "invalid" {
  if (!header) return null;

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());

  if (!match || size <= 0) return "invalid";

  const startText = match[1];
  const endText = match[2];

  if (!startText && !endText) return "invalid";

  let start: number;
  let end: number;

  if (!startText) {
    const suffix = Number(endText);

    if (!Number.isSafeInteger(suffix) || suffix <= 0) {
      return "invalid";
    }

    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(startText);

    if (!Number.isSafeInteger(start) || start >= size) {
      return "invalid";
    }

    if (!endText) {
      end = size - 1;
    } else {
      end = Number(endText);

      if (!Number.isSafeInteger(end) || end < start) {
        return "invalid";
      }

      end = Math.min(end, size - 1);
    }
  }

  return {
    offset: start,
    length: end - start + 1,
    end,
  };
}

// POST : envoyer un média dans R2.
export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);

    if (!user) {
      return errorResponse("Session utilisateur invalide.", 401);
    }

    const formData = await request.formData();

    const file = formData.get("file");
    const categoryValue = String(formData.get("category") || "");

    if (!(file instanceof File)) {
      return errorResponse("Aucun fichier reçu.");
    }

    if (!validCategory(categoryValue)) {
      return errorResponse("Catégorie de média invalide.");
    }

    const category = categoryValue;

    if (file.size <= 0 || file.size > LIMITS[category]) {
      return errorResponse(
        `Fichier trop volumineux. Limite : ${Math.round(
          LIMITS[category] / 1024 / 1024
        )} Mo.`
      );
    }

    const allowedTypes =
      category === "stories"
        ? new Set([...IMAGE_TYPES, ...STORY_VIDEO_TYPES])
        : IMAGE_TYPES;

    if (!allowedTypes.has(file.type)) {
      return errorResponse("Format de fichier non accepté.");
    }

    const extension = extensionForMime(file.type);

    if (!extension) {
      return errorResponse("Extension de fichier non autorisée.");
    }

    const bucket = await getBucket();

    const filename = `${crypto.randomUUID()}.${extension}`;
    const key = `${category}/${user.id}/${filename}`;

    const bytes = await file.arrayBuffer();

    await bucket.put(key, bytes, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata: {
        ownerId: user.id,
        category,
      },
    });

    const mediaUrl = `/api/media?key=${encodeURIComponent(key)}`;

    return NextResponse.json({
      success: true,
      key,
      url: mediaUrl,
      category,
      size: file.size,
      contentType: file.type,
    });
  } catch (error) {
    console.error("Erreur API médias :", error);

    return errorResponse(
      error instanceof Error
        ? error.message
        : "Impossible d'envoyer le fichier.",
      500
    );
  }
}

// GET : lire un média public stocké dans R2.
export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get("key") || "";

    if (!validKey(key)) {
      return errorResponse("Média introuvable.", 404);
    }

    const bucket = await getBucket();
    const object = await bucket.get(key);

    if (!object) {
      return errorResponse("Média introuvable.", 404);
    }

    const range = parseRange(
      request.headers.get("range"),
      object.size
    );

    if (range === "invalid") {
      return new NextResponse(null, {
        status: 416,
        headers: {
          "Content-Range": `bytes */${object.size}`,
          "Accept-Ranges": "bytes",
        },
      });
    }

    // Pour une requête partielle, récupérer uniquement la plage demandée.
    const selectedObject =
      range === null
        ? object
        : await bucket.get(key, {
            range: {
              offset: range.offset,
              length: range.length,
            },
          });

    if (!selectedObject) {
      return errorResponse("Média introuvable.", 404);
    }

    const headers = new Headers();

    headers.set(
      "Content-Type",
      selectedObject.httpMetadata?.contentType ||
        "application/octet-stream"
    );

    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Accept-Ranges", "bytes");
    headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );

    headers.set(
      "Content-Length",
      String(range ? range.length : object.size)
    );

    if (selectedObject.httpEtag) {
      headers.set("ETag", selectedObject.httpEtag);
    }

    if (range) {
      headers.set(
        "Content-Range",
        `bytes ${range.offset}-${range.end}/${object.size}`
      );
    }

    return new NextResponse(selectedObject.body, {
      status: range ? 206 : 200,
      headers,
    });
  } catch (error) {
    console.error("Erreur de lecture média :", error);

    return errorResponse(
      "Le média est temporairement indisponible.",
      503
    );
  }
}

// DELETE : seul le propriétaire du fichier peut le supprimer.
export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticate(request);

    if (!user) {
      return errorResponse("Session utilisateur invalide.", 401);
    }

    const body = await request.json().catch(() => null);
    const key = String(body?.key || "");

    if (!validKey(key)) {
      return errorResponse("Chemin de fichier invalide.");
    }

    const expectedPrefix = `${key.split("/")[0]}/${user.id}/`;

    if (!key.startsWith(expectedPrefix)) {
      return errorResponse(
        "Tu ne peux pas supprimer le fichier d'un autre utilisateur.",
        403
      );
    }

    const bucket = await getBucket();

    await bucket.delete(key);

    return NextResponse.json({
      success: true,
      deleted: true,
    });
  } catch (error) {
    console.error("Erreur de suppression média :", error);

    return errorResponse(
      "Impossible de supprimer ce média.",
      500
    );
  }
}

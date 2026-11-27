import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MediaCategory = "avatars" | "stories" | "products";

interface R2ObjectBody {
  body: ReadableStream<Uint8Array>;
  size: number;
  httpEtag?: string;
  httpMetadata?: {
    contentType?: string;
    cacheControl?: string;
  };
}

interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer,
    options?: {
      httpMetadata?: {
        contentType?: string;
        cacheControl?: string;
      };
    }
  ): Promise<unknown>;

  head(key: string): Promise<{ size: number } | null>;

  get(
    key: string,
    options?: {
      range?: {
        offset: number;
        length?: number;
      };
    }
  ): Promise<R2ObjectBody | null>;

  delete(key: string): Promise<void>;
}

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const MAX_PRODUCT_SIZE = 5 * 1024 * 1024;
const MAX_STORY_SIZE = 30 * 1024 * 1024;

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const STORY_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isCategory(value: string): value is MediaCategory {
  return (
    value === "avatars" ||
    value === "stories" ||
    value === "products"
  );
}

function normalizeMimeType(type: string): string {
  return type.split(";")[0].trim().toLowerCase();
}

function getExtension(file: File): string {
  const mimeType = normalizeMimeType(file.type);

  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };

  return extensions[mimeType] || "";
}

function isValidKey(key: string): boolean {
  return /^(avatars|stories|products)\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|png|webp|mp4|webm|mov)$/i.test(
    key
  );
}

async function getBucket(): Promise<R2Bucket> {
  const context = await getCloudflareContext({ async: true });

  const env = context.env as unknown as {
    MOSHI_MEDIA?: R2Bucket;
  };

  if (!env.MOSHI_MEDIA) {
    throw new Error("Le stockage R2 MOSHI_MEDIA est introuvable.");
  }

  return env.MOSHI_MEDIA;
}

async function getAuthenticatedUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Authentification requise.");
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    throw new Error("Jeton d'authentification manquant.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Configuration Supabase manquante.");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error("Session invalide. Reconnecte-toi.");
  }

  return user;
}

function parseRange(
  header: string | null,
  size: number
): { offset: number; length: number } | null {
  if (!header) return null;

  const match = header.match(/^bytes=(\d*)-(\d*)$/);

  if (!match) return null;

  let start: number;
  let end: number;

  if (match[1] === "") {
    const suffixLength = Number(match[2]);

    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return null;
    }

    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Number(match[2]);
  }

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end < start ||
    start >= size
  ) {
    return null;
  }

  end = Math.min(end, size - 1);

  return {
    offset: start,
    length: end - start + 1,
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    const formData = await request.formData();
    const file = formData.get("file");
    const categoryValue = formData.get("category");

    if (!(file instanceof File)) {
      return jsonError("Fichier manquant.");
    }

    if (
      typeof categoryValue !== "string" ||
      !isCategory(categoryValue)
    ) {
      return jsonError("Catégorie de média invalide.");
    }

    const category = categoryValue;
    const mimeType = normalizeMimeType(file.type);
    const extension = getExtension(file);

    if (!extension) {
      return jsonError("Format de fichier non accepté.");
    }

    const isImage = IMAGE_TYPES.includes(mimeType);

    const isStoryVideo =
      category === "stories" &&
      STORY_VIDEO_TYPES.includes(mimeType);

    if (category === "avatars" && !isImage) {
      return jsonError("Une photo JPG, PNG ou WebP est nécessaire.");
    }

    if (category === "products" && !isImage) {
      return jsonError("Une photo JPG, PNG ou WebP est nécessaire.");
    }

    if (category === "stories" && !isImage && !isStoryVideo) {
      return jsonError("Format de story non accepté.");
    }

    const maxSize =
      category === "stories"
        ? MAX_STORY_SIZE
        : category === "avatars"
          ? MAX_AVATAR_SIZE
          : MAX_PRODUCT_SIZE;

    if (file.size <= 0 || file.size > maxSize) {
      return jsonError(
        `Fichier trop volumineux. Limite : ${Math.round(
          maxSize / 1024 / 1024
        )} Mo.`
      );
    }

    const key = `${category}/${user.id}/${crypto.randomUUID()}.${extension}`;

    const bucket = await getBucket();

    await bucket.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: mimeType,
        cacheControl: "public, max-age=31536000, immutable",
      },
    });

    return NextResponse.json({
      success: true,
      key,
      url: `/api/media?key=${encodeURIComponent(key)}`,
    });
  } catch (error) {
    console.error("Moshi media upload:", error);

    return jsonError(
      error instanceof Error
        ? error.message
        : "Erreur pendant l'envoi du média.",
      500
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get("key");

    // Les clés comment-audio ne sont plus acceptées ici.
    // Elles doivent exclusivement passer par /api/comments/voice.
    if (!key || !isValidKey(key)) {
      return jsonError("Adresse du média invalide.", 400);
    }

    const bucket = await getBucket();
    const metadata = await bucket.head(key);

    if (!metadata) {
      return jsonError("Média introuvable.", 404);
    }

    const rangeHeader = request.headers.get("range");
    const range = parseRange(rangeHeader, metadata.size);

    if (rangeHeader && !range) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          "Content-Range": `bytes */${metadata.size}`,
        },
      });
    }

    const object = await bucket.get(
      key,
      range ? { range } : undefined
    );

    if (!object) {
      return jsonError("Média introuvable.", 404);
    }

    const extension = key.split(".").pop()?.toLowerCase();

    const contentTypes: Record<string, string> = {
      jpg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      mp4: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
    };

    const headers = new Headers();

    headers.set(
      "Content-Type",
      contentTypes[extension || ""] || "application/octet-stream"
    );

    headers.set("Accept-Ranges", "bytes");
    headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );
    headers.set("X-Content-Type-Options", "nosniff");

    if (range) {
      headers.set(
        "Content-Range",
        `bytes ${range.offset}-${range.offset + range.length - 1}/${metadata.size}`
      );

      headers.set("Content-Length", String(range.length));

      return new NextResponse(object.body, {
        status: 206,
        headers,
      });
    }

    headers.set("Content-Length", String(metadata.size));

    return new NextResponse(object.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Moshi media read:", error);

    return jsonError("Impossible de récupérer ce média.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    const key = request.nextUrl.searchParams.get("key");

    if (!key || !isValidKey(key)) {
      return jsonError("Adresse du média invalide.");
    }

    const ownedCategories = [
      `avatars/${user.id}/`,
      `stories/${user.id}/`,
      `products/${user.id}/`,
    ];

    if (!ownedCategories.some((prefix) => key.startsWith(prefix))) {
      return jsonError("Tu ne peux pas supprimer ce média.", 403);
    }

    const bucket = await getBucket();

    await bucket.delete(key);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Moshi media delete:", error);

    return jsonError(
      error instanceof Error
        ? error.message
        : "Impossible de supprimer le média.",
      500
    );
  }
}
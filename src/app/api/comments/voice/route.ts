
import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_SIZE = 10 * 1024 * 1024;

const AUDIO_TYPES: Record<string, string> = {
  "audio/mp4": "m4a",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/aac": "aac",
};

interface R2ObjectBody {
  body: ReadableStream<Uint8Array>;
  size: number;
  httpMetadata?: {
    contentType?: string;
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
      customMetadata?: Record<string, string>;
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

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
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

async function getAuthenticatedClient() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false as const,
      response: jsonError(
        "Session invalide. Connecte-toi pour accéder aux vocaux.",
        401
      ),
    };
  }

  return {
    ok: true as const,
    supabase,
    user,
  };
}

function parseRange(
  header: string | null,
  size: number
): { offset: number; length: number } | null | false {
  if (!header) return null;

  const match = header.match(/^bytes=(\d*)-(\d*)$/);

  if (!match) return false;

  let start: number;
  let end: number;

  if (match[1] === "") {
    const suffixLength = Number(match[2]);

    if (
      !Number.isFinite(suffixLength) ||
      suffixLength <= 0
    ) {
      return false;
    }

    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end =
      match[2] === ""
        ? size - 1
        : Number(match[2]);
  }

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end < start ||
    start >= size
  ) {
    return false;
  }

  end = Math.min(end, size - 1);

  return {
    offset: start,
    length: end - start + 1,
  };
}

function validObjectKey(key: string, userId: string) {
  const prefix = `comment-audio/${userId}/`;

  if (!key.startsWith(prefix)) return false;

  return /^[a-f0-9-]{36}\.(m4a|webm|ogg|mp3|wav|aac)$/i.test(
    key.slice(prefix.length)
  );
}

export async function POST(request: NextRequest) {
  let uploadedKey: string | null = null;

  try {
    const auth = await getAuthenticatedClient();

    if (!auth.ok) return auth.response;

    const formData = await request.formData();

    const file = formData.get("file");
    const videoId = formData.get("videoId");
    const parentCommentId = formData.get("parentCommentId");
    const durationValue = formData.get("durationMs");

    if (!(file instanceof File)) {
      return jsonError("Fichier audio manquant.");
    }

    if (
      typeof videoId !== "string" ||
      !/^[a-f0-9-]{36}$/i.test(videoId)
    ) {
      return jsonError("Identifiant vidéo invalide.");
    }

    if (
      parentCommentId !== null &&
      (typeof parentCommentId !== "string" ||
        !/^[a-f0-9-]{36}$/i.test(parentCommentId))
    ) {
      return jsonError("Identifiant de réponse invalide.");
    }

    const contentType = file.type
      .split(";")[0]
      .trim()
      .toLowerCase();

    const extension = AUDIO_TYPES[contentType];

    if (!extension) {
      return jsonError("Format audio non accepté.");
    }

    if (file.size <= 0 || file.size > MAX_AUDIO_SIZE) {
      return jsonError("Le fichier audio dépasse la limite de 10 Mo.");
    }

    let durationMs: number | null = null;

    if (
      typeof durationValue === "string" &&
      durationValue.trim() !== ""
    ) {
      const parsedDuration = Number(durationValue);

      if (
        !Number.isInteger(parsedDuration) ||
        parsedDuration < 1 ||
        parsedDuration > 600000
      ) {
        return jsonError("Durée audio invalide.");
      }

      durationMs = parsedDuration;
    }

    const bucket = await getBucket();

    const uuid = crypto.randomUUID();

    const key =
      `comment-audio/${auth.user.id}/${uuid}.${extension}`;

    await bucket.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType,
        cacheControl: "private, no-store",
      },
      customMetadata: {
        ownerId: auth.user.id,
        mediaType: "comment-audio",
      },
    });

    uploadedKey = key;

    const { data: comment, error: insertError } =
      await auth.supabase
        .from("video_comments")
        .insert({
          video_id: videoId,
          user_id: auth.user.id,
          content: "🎤 Message vocal",
          parent_comment_id:
            typeof parentCommentId === "string"
              ? parentCommentId
              : null,
          voice_object_key: key,
          voice_content_type: contentType,
          voice_duration_ms: durationMs,
          voice_url: null,
        })
        .select(
          "id, content, created_at, user_id, parent_comment_id, voice_url, voice_object_key, voice_content_type, voice_duration_ms"
        )
        .single();

    if (insertError || !comment) {
      console.error(
        "Enregistrement commentaire vocal :",
        insertError
      );

      await bucket.delete(key);
      uploadedKey = null;

      return jsonError(
        "Impossible d'enregistrer le commentaire vocal.",
        500
      );
    }

    return NextResponse.json(
      {
        success: true,
        comment,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Upload commentaire vocal :", error);

    if (uploadedKey) {
      try {
        const bucket = await getBucket();
        await bucket.delete(uploadedKey);
      } catch (cleanupError) {
        console.error(
          "Nettoyage R2 après erreur :",
          cleanupError
        );
      }
    }

    return jsonError(
      "Impossible d'envoyer le message vocal.",
      500
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedClient();

    if (!auth.ok) return auth.response;

    const commentId =
      request.nextUrl.searchParams.get("commentId");

    if (
      !commentId ||
      !/^[a-f0-9-]{36}$/i.test(commentId)
    ) {
      return jsonError("Identifiant de commentaire invalide.");
    }

    const { data: comment, error } = await auth.supabase
      .from("video_comments")
      .select(
        "id, voice_object_key, voice_content_type"
      )
      .eq("id", commentId)
      .maybeSingle();

    if (error) {
      console.error("Lecture commentaire vocal :", error);

      return jsonError(
        "Impossible de vérifier le commentaire.",
        500
      );
    }

    if (!comment?.voice_object_key) {
      return jsonError("Message vocal introuvable.", 404);
    }

    const key = comment.voice_object_key;

    if (!validObjectKey(key, comment.voice_object_key.split("/")[1])) {
      return jsonError("Référence audio invalide.", 400);
    }

    const bucket = await getBucket();
    const metadata = await bucket.head(key);

    if (!metadata) {
      return jsonError("Fichier audio introuvable.", 404);
    }

    const rangeHeader = request.headers.get("range");
    const range = parseRange(rangeHeader, metadata.size);

    if (range === false) {
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
      return jsonError("Fichier audio introuvable.", 404);
    }

    const allowedTypes = Object.keys(AUDIO_TYPES);

    const contentType =
      comment.voice_content_type &&
      allowedTypes.includes(comment.voice_content_type)
        ? comment.voice_content_type
        : "application/octet-stream";

    const headers = new Headers();

    headers.set("Content-Type", contentType);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "private, no-store, max-age=0");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "no-referrer");

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
    console.error("Lecture commentaire vocal :", error);

    return jsonError(
      "Impossible de lire ce message vocal.",
      500
    );
  }
}

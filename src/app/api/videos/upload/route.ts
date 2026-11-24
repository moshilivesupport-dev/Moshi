
import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 500 * 1024 * 1024;
const PART_SIZE = 8 * 1024 * 1024;
const MAX_PARTS = 100;
const ALLOWED_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
]);

type UploadedPart = {
  partNumber: number;
  etag: string;
};

type UploadSession = {
  id: string;
  user_id: string;
  object_key: string;
  upload_id: string;
  file_size: number;
  mime_type: string;
  expected_parts: number;
  status: "initiated" | "completed" | "aborted";
  expires_at: string;
};

type R2Multipart = {
  uploadPart(
    partNumber: number,
    value: ArrayBuffer
  ): Promise<UploadedPart>;
  complete(parts: UploadedPart[]): Promise<unknown>;
  abort(): Promise<void>;
};

type R2Bucket = {
  createMultipartUpload(
    key: string,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<{ key: string; uploadId: string }>;
  resumeMultipartUpload(key: string, uploadId: string): R2Multipart;
  delete(key: string): Promise<void>;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getServices() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceKey) {
    throw new Error("Configuration Supabase manquante.");
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return { supabaseUrl, anonKey, admin };
}

async function authenticate(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();

  if (!token) return null;

  const { supabaseUrl, anonKey } = getServices();

  const client = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await client.auth.getUser(token);

  if (error || !data.user) return null;

  return data.user;
}

async function getSession(
  sessionId: string,
  userId: string
): Promise<UploadSession | null> {
  const { admin } = getServices();

  const { data, error } = await admin
    .from("video_upload_sessions")
    .select(
      "id,user_id,object_key,upload_id,file_size,mime_type,expected_parts,status,expires_at"
    )
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return data as UploadSession;
}

async function getBucket(): Promise<R2Bucket> {
  const context = await getCloudflareContext({ async: true });
  const bucket = context.env.MOSHI_MEDIA as R2Bucket | undefined;

  if (!bucket) {
    throw new Error("Le bucket R2 MOSHI_MEDIA est indisponible.");
  }

  return bucket;
}

function isValidSession(session: UploadSession) {
  return (
    session.status === "initiated" &&
    new Date(session.expires_at).getTime() > Date.now()
  );
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticate(request);

    if (!user) {
      return jsonError("Session utilisateur invalide.", 401);
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body.action !== "string") {
      return jsonError("Action manquante.");
    }

    const { admin } = getServices();
    const bucket = await getBucket();

    // 1. Création d'une session multipartielle.
    if (body.action === "create") {
      const fileSize = Number(body.fileSize);
      const mimeType = String(body.mimeType || "");
      const duration = Number(body.durationSeconds || 0);

      if (
        !Number.isSafeInteger(fileSize) ||
        fileSize <= 0 ||
        fileSize > MAX_FILE_SIZE
      ) {
        return jsonError("La vidéo doit faire au maximum 500 Mo.");
      }

      if (!ALLOWED_TYPES.has(mimeType)) {
        return jsonError("Format vidéo non autorisé.");
      }

      if (
        !Number.isFinite(duration) ||
        duration < 0 ||
        duration > 120
      ) {
        return jsonError("Durée vidéo invalide (maximum 120 secondes).");
      }

      const expectedParts = Math.ceil(fileSize / PART_SIZE);

      if (expectedParts < 1 || expectedParts > MAX_PARTS) {
        return jsonError("Nombre de parties invalide.");
      }

      const extension =
        mimeType === "video/quicktime"
          ? "mov"
          : mimeType === "video/webm"
            ? "webm"
            : "mp4";

      const objectKey =
        `videos/${user.id}/${crypto.randomUUID()}.${extension}`;

      const multipart = await bucket.createMultipartUpload(
        objectKey,
        {
          httpMetadata: {
            contentType: mimeType,
          },
        }
      );

      const { data: session, error: insertError } = await admin
        .from("video_upload_sessions")
        .insert({
          user_id: user.id,
          object_key: objectKey,
          upload_id: multipart.uploadId,
          file_size: fileSize,
          mime_type: mimeType,
          expected_parts: expectedParts,
          status: "initiated",
        })
        .select("id,expected_parts")
        .single();

      if (insertError || !session) {
        try {
          await bucket
            .resumeMultipartUpload(objectKey, multipart.uploadId)
            .abort();
        } catch (cleanupError) {
          console.error("Échec du nettoyage multipartiel.");
        }

        return jsonError(
          "Impossible de créer la session d'upload.",
          500
        );
      }

      return NextResponse.json({
        sessionId: session.id,
        partSize: PART_SIZE,
        expectedParts: session.expected_parts,
      });
    }

    // 2. Finalisation de l'upload et création de la vidéo.
    if (body.action === "complete") {
      const sessionId = String(body.sessionId || "");
      const parts = body.parts as UploadedPart[];
      const caption = String(body.caption || "").slice(0, 2200);
      const duration = Number(body.durationSeconds || 0);

      if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
        return jsonError("Session invalide.");
      }

      if (
        !Array.isArray(parts) ||
        !Number.isFinite(duration) ||
        duration < 0 ||
        duration > 120
      ) {
        return jsonError("Informations de finalisation invalides.");
      }

      const session = await getSession(sessionId, user.id);

      if (!session || !isValidSession(session)) {
        return jsonError("Session expirée ou introuvable.", 404);
      }

      if (parts.length !== session.expected_parts) {
        return jsonError("Toutes les parties ne sont pas présentes.");
      }

      const normalizedParts: UploadedPart[] = [];
      const seen = new Set<number>();

      for (const part of parts) {
        const partNumber = Number(part?.partNumber);
        const etag = String(part?.etag || "");

        if (
          !Number.isInteger(partNumber) ||
          partNumber < 1 ||
          partNumber > session.expected_parts ||
          !etag ||
          etag.length > 256 ||
          seen.has(partNumber)
        ) {
          return jsonError("Une partie envoyée est invalide.");
        }

        seen.add(partNumber);
        normalizedParts.push({ partNumber, etag });
      }

      normalizedParts.sort(
        (a, b) => a.partNumber - b.partNumber
      );

      for (let i = 0; i < normalizedParts.length; i++) {
        if (normalizedParts[i].partNumber !== i + 1) {
          return jsonError("Une partie est manquante.");
        }
      }

      const multipart = bucket.resumeMultipartUpload(
        session.object_key,
        session.upload_id
      );

      try {
        await multipart.complete(normalizedParts);
      } catch (error) {
        console.error("Erreur de finalisation R2.");
        return jsonError(
          "Impossible de finaliser la vidéo. Réessaie.",
          502
        );
      }

      const { data: video, error: videoError } = await admin
        .from("videos")
        .insert({
          user_id: user.id,
          url: session.object_key,
          storage_provider: "r2",
          storage_key: session.object_key,
          caption,
          duration_seconds: duration,
          status: "published",
          is_public: true,
        })
        .select("id")
        .single();

      if (videoError || !video) {
        try {
          await bucket.delete(session.object_key);
        } catch (cleanupError) {
          console.error("Échec du nettoyage du fichier R2.");
        }

        await admin
          .from("video_upload_sessions")
          .update({ status: "aborted" })
          .eq("id", session.id);

        return jsonError(
          "La vidéo a été envoyée mais son enregistrement a échoué.",
          500
        );
      }

      await admin
        .from("video_upload_sessions")
        .update({ status: "completed" })
        .eq("id", session.id);

      return NextResponse.json({
        success: true,
        videoId: video.id,
      });
    }

    return jsonError("Action POST inconnue.");
  } catch (error) {
    console.error("Erreur API upload vidéo.");
    return jsonError(
      "Service d'upload temporairement indisponible.",
      500
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await authenticate(request);

    if (!user) {
      return jsonError("Session utilisateur invalide.", 401);
    }

    const sessionId = request.nextUrl.searchParams.get("sessionId");
    const partNumber = Number(
      request.nextUrl.searchParams.get("partNumber")
    );

    if (
      !sessionId ||
      !/^[0-9a-f-]{36}$/i.test(sessionId) ||
      !Number.isInteger(partNumber) ||
      partNumber < 1 ||
      partNumber > MAX_PARTS
    ) {
      return jsonError("Paramètres d'upload invalides.");
    }

    const session = await getSession(sessionId, user.id);

    if (!session || !isValidSession(session)) {
      return jsonError("Session expirée ou introuvable.", 404);
    }

    if (partNumber > session.expected_parts) {
      return jsonError("Numéro de partie invalide.");
    }

    const expectedSize =
      partNumber < session.expected_parts
        ? PART_SIZE
        : session.file_size - PART_SIZE * (session.expected_parts - 1);

    const contentLength = Number(
      request.headers.get("content-length")
    );

    if (
      !Number.isSafeInteger(contentLength) ||
      contentLength !== expectedSize ||
      contentLength > PART_SIZE
    ) {
      return jsonError("Taille de partie incorrecte.");
    }

    const data = await request.arrayBuffer();

    if (data.byteLength !== expectedSize) {
      return jsonError("Données de partie incomplètes.");
    }

    const bucket = await getBucket();

    const multipart = bucket.resumeMultipartUpload(
      session.object_key,
      session.upload_id
    );

    const uploadedPart = await multipart.uploadPart(
      partNumber,
      data
    );

    return NextResponse.json({
      partNumber: uploadedPart.partNumber,
      etag: uploadedPart.etag,
    });
  } catch (error) {
    console.error("Erreur pendant l'envoi d'une partie R2.");
    return jsonError("Échec de l'envoi de cette partie.", 502);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticate(request);

    if (!user) {
      return jsonError("Session utilisateur invalide.", 401);
    }

    const sessionId = request.nextUrl.searchParams.get("sessionId");

    if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
      return jsonError("Session invalide.");
    }

    const session = await getSession(sessionId, user.id);

    if (!session) {
      return jsonError("Session introuvable.", 404);
    }

    if (session.status !== "initiated") {
      return NextResponse.json({ success: true });
    }

    const bucket = await getBucket();

    try {
      await bucket
        .resumeMultipartUpload(
          session.object_key,
          session.upload_id
        )
        .abort();
    } catch (error) {
      console.error("L'annulation R2 a échoué ou la session est déjà fermée.");
    }

    const { admin } = getServices();

    await admin
      .from("video_upload_sessions")
      .update({ status: "aborted" })
      .eq("id", session.id)
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur annulation upload vidéo.");
    return jsonError("Impossible d'annuler l'upload.", 500);
  }
}

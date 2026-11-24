
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

type R2ObjectMetadata = {
  size: number;
};

type R2Bucket = {
  createMultipartUpload(
    key: string,
    options?: {
      httpMetadata?: {
        contentType?: string;
      };
    }
  ): Promise<{
    key: string;
    uploadId: string;
  }>;

  resumeMultipartUpload(
    key: string,
    uploadId: string
  ): R2Multipart;

  head(key: string): Promise<R2ObjectMetadata | null>;
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

  if (!authorization?.startsWith("Bearer ")) return null;

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

function isUnexpired(session: UploadSession) {
  return new Date(session.expires_at).getTime() > Date.now();
}

function isValidSession(session: UploadSession) {
  return session.status === "initiated" && isUnexpired(session);
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function findExistingVideo(
  storageKey: string,
  userId: string
): Promise<string | null> {
  const { admin } = getServices();

  const { data, error } = await admin
    .from("videos")
    .select("id")
    .eq("storage_provider", "r2")
    .eq("storage_key", storageKey)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Vérification de vidéo existante impossible.");
    throw new Error("Impossible de vérifier la vidéo.");
  }

  return data?.id ?? null;
}

async function markSession(
  sessionId: string,
  userId: string,
  status: "completed" | "aborted"
) {
  const { admin } = getServices();

  const { error } = await admin
    .from("video_upload_sessions")
    .update({ status })
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (error) {
    console.error("Mise à jour de session impossible.");
    throw new Error("Impossible de mettre à jour la session.");
  }
}

async function abortMultipart(
  bucket: R2Bucket,
  session: UploadSession
) {
  try {
    await bucket
      .resumeMultipartUpload(session.object_key, session.upload_id)
      .abort();
  } catch {
    // Le multipart peut déjà être terminé ou annulé.
  }
}

function normalizeParts(
  parts: unknown,
  expectedParts: number
): UploadedPart[] | null {
  if (!Array.isArray(parts) || parts.length !== expectedParts) {
    return null;
  }

  const normalized: UploadedPart[] = [];
  const seen = new Set<number>();

  for (const part of parts) {
    const partNumber = Number(part?.partNumber);
    const etag = String(part?.etag || "");

    if (
      !Number.isInteger(partNumber) ||
      partNumber < 1 ||
      partNumber > expectedParts ||
      !etag ||
      etag.length > 256 ||
      seen.has(partNumber)
    ) {
      return null;
    }

    seen.add(partNumber);
    normalized.push({ partNumber, etag });
  }

  normalized.sort((a, b) => a.partNumber - b.partNumber);

  for (let index = 0; index < normalized.length; index++) {
    if (normalized[index].partNumber !== index + 1) {
      return null;
    }
  }

  return normalized;
}

async function readFinalObject(
  bucket: R2Bucket,
  key: string
): Promise<R2ObjectMetadata | null> {
  try {
    return await bucket.head(key);
  } catch {
    // Une erreur de lecture n'est pas assimilée à une absence certaine.
    throw new Error("Impossible de vérifier le fichier dans R2.");
  }
}

async function saveVideo(
  session: UploadSession,
  userId: string,
  caption: string,
  duration: number
): Promise<string> {
  const { admin } = getServices();

  const { data: video, error } = await admin
    .from("videos")
    .insert({
      user_id: userId,
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

  if (!error && video) return video.id;

  // Une autre requête a peut-être inséré la même vidéo.
  const existingId = await findExistingVideo(
    session.object_key,
    userId
  );

  if (existingId) return existingId;

  console.error(
    "Enregistrement de la vidéo dans Supabase impossible."
  );

  throw new Error(
    "Vidéo envoyée, mais son enregistrement a échoué. Réessaie la finalisation."
  );
}

// ======================================================
// POST : CRÉER UNE SESSION OU FINALISER UNE VIDÉO
// ======================================================

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

    // ==================================================
    // CRÉATION DE SESSION
    // ==================================================

    if (body.action === "create") {
      const fileSize = Number(body.fileSize);
      const mimeType = String(body.mimeType || "");
      const duration = Number(body.durationSeconds);

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
        duration <= 0 ||
        duration > 120
      ) {
        return jsonError(
          "Durée vidéo invalide (maximum 120 secondes)."
        );
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

      const bucket = await getBucket();

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
        } catch {
          console.error("Nettoyage de la session R2 impossible.");
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

    // ==================================================
    // FINALISATION
    // ==================================================

    if (body.action === "complete") {
      const sessionId = String(body.sessionId || "");

      const caption =
        typeof body.caption === "string"
          ? body.caption.trim().slice(0, 2200)
          : "";

      const duration = Number(body.durationSeconds);

      if (!validUuid(sessionId)) {
        return jsonError("Session invalide.");
      }

      if (
        !Number.isFinite(duration) ||
        duration <= 0 ||
        duration > 120
      ) {
        return jsonError("Durée vidéo invalide.");
      }

      const session = await getSession(sessionId, user.id);

      if (!session) {
        return jsonError("Session expirée ou introuvable.", 404);
      }

      if (session.status === "aborted") {
        return jsonError("Cette session a été annulée.", 409);
      }

      // 1. Si la vidéo est déjà en base, renvoyer son identifiant.
      const existingVideoId = await findExistingVideo(
        session.object_key,
        user.id
      );

      if (existingVideoId) {
        if (session.status !== "completed") {
          await markSession(session.id, user.id, "completed");
        }

        return NextResponse.json({
          success: true,
          videoId: existingVideoId,
        });
      }

      const bucket = await getBucket();

      // 2. Vérifier R2 AVANT de demander les parties au client.
      // Cela permet de reprendre après une finalisation R2 réussie.
      let metadata = await readFinalObject(
        bucket,
        session.object_key
      );

      // 3. Si l'objet final existe déjà, les parties ne sont plus nécessaires.
      if (metadata) {
        if (metadata.size !== session.file_size) {
          try {
            await bucket.delete(session.object_key);
          } catch {
            console.error("Nettoyage du fichier R2 invalide impossible.");
          }

          await markSession(session.id, user.id, "aborted");

          return jsonError(
            "La taille du fichier reçu ne correspond pas à celle annoncée.",
            400
          );
        }
      } else {
        // 4. Sans objet final, la session doit être encore valide.
        if (!isValidSession(session)) {
          return jsonError("Session expirée ou introuvable.", 404);
        }

        const normalizedParts = normalizeParts(
          body.parts,
          session.expected_parts
        );

        if (!normalizedParts) {
          return jsonError(
            "Les parties envoyées sont absentes ou invalides."
          );
        }

        const multipart = bucket.resumeMultipartUpload(
          session.object_key,
          session.upload_id
        );

        try {
          await multipart.complete(normalizedParts);
        } catch {
          // Une autre tentative a peut-être déjà terminé le multipart.
          metadata = await readFinalObject(
            bucket,
            session.object_key
          );

          if (!metadata) {
            return jsonError(
              "Impossible de finaliser la vidéo. Réessaie.",
              502
            );
          }
        }

        // 5. Vérifier que le fichier final est bien disponible.
        if (!metadata) {
          metadata = await readFinalObject(
            bucket,
            session.object_key
          );
        }

        if (!metadata) {
          return jsonError(
            "R2 ne confirme pas encore la disponibilité de la vidéo. Réessaie.",
            503
          );
        }

        if (metadata.size !== session.file_size) {
          try {
            await bucket.delete(session.object_key);
          } catch {
            console.error("Suppression du fichier R2 invalide impossible.");
          }

          await markSession(session.id, user.id, "aborted");

          return jsonError(
            "La taille du fichier reçu ne correspond pas à celle annoncée.",
            400
          );
        }
      }

      // 6. Enregistrer la vidéo dans Supabase.
      // Si cela échoue, on conserve le fichier R2 pour une nouvelle tentative.
      const videoId = await saveVideo(
        session,
        user.id,
        caption,
        duration
      );

      // 7. Marquer la session terminée.
      await markSession(session.id, user.id, "completed");

      return NextResponse.json({
        success: true,
        videoId,
      });
    }

    return jsonError("Action POST inconnue.");
  } catch (error) {
    console.error(
      "Erreur API upload vidéo.",
      error instanceof Error ? error.message : "Erreur inconnue"
    );

    const message =
      error instanceof Error ? error.message : "";

    if (message.includes("son enregistrement a échoué")) {
      return jsonError(message, 500);
    }

    if (message.includes("vérifier le fichier dans R2")) {
      return jsonError(message, 503);
    }

    return jsonError(
      "Service d'upload temporairement indisponible.",
      500
    );
  }
}

// ======================================================
// PUT : ENVOYER UNE PARTIE DU FICHIER
// ======================================================

export async function PUT(request: NextRequest) {
  try {
    const user = await authenticate(request);

    if (!user) {
      return jsonError("Session utilisateur invalide.", 401);
    }

    const sessionId =
      request.nextUrl.searchParams.get("sessionId");

    const partNumber = Number(
      request.nextUrl.searchParams.get("partNumber")
    );

    if (
      !sessionId ||
      !validUuid(sessionId) ||
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
        : session.file_size -
          PART_SIZE * (session.expected_parts - 1);

    const contentLengthHeader =
      request.headers.get("content-length");

    if (contentLengthHeader !== null) {
      const declaredSize = Number(contentLengthHeader);

      if (
        !Number.isSafeInteger(declaredSize) ||
        declaredSize !== expectedSize
      ) {
        return jsonError("Taille de partie incorrecte.");
      }
    }

    const data = await request.arrayBuffer();

    if (
      data.byteLength !== expectedSize ||
      data.byteLength > PART_SIZE
    ) {
      return jsonError(
        "Données de partie incomplètes ou invalides."
      );
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
    console.error(
      "Erreur pendant l'envoi d'une partie R2.",
      error instanceof Error ? error.message : "Erreur inconnue"
    );

    return jsonError("Échec de l'envoi de cette partie.", 502);
  }
}

// ======================================================
// DELETE : ANNULER UNE SESSION
// ======================================================

export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticate(request);

    if (!user) {
      return jsonError("Session utilisateur invalide.", 401);
    }

    const sessionId =
      request.nextUrl.searchParams.get("sessionId");

    if (!sessionId || !validUuid(sessionId)) {
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

    await abortMultipart(bucket, session);
    await markSession(session.id, user.id, "aborted");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "Erreur annulation upload vidéo.",
      error instanceof Error ? error.message : "Erreur inconnue"
    );

    return jsonError("Impossible d'annuler l'upload.", 500);
  }
}

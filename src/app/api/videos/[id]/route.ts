
import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VideoRow = {
  id: string;
  url: string;
  status: string | null;
  allow_download: boolean | null;
  storage_provider: string | null;
  storage_key: string | null;
};

type R2ObjectBody = {
  body: ReadableStream<Uint8Array>;
  size: number;
  httpEtag?: string;
  httpMetadata?: {
    contentType?: string;
    contentDisposition?: string;
    cacheControl?: string;
  };
};

type R2Bucket = {
  get(
    key: string,
    options?: {
      range?: {
        offset: number;
        length: number;
      };
    }
  ): Promise<R2ObjectBody | null>;
};

function getStoragePath(
  value: string,
  supabaseUrl: string
): string | null {
  try {
    // Les nouveaux enregistrements Supabase peuvent contenir
    // directement le chemin du fichier.
    if (!/^https?:\/\//i.test(value)) {
      const path = value.replace(/^\/+/, "");

      return path && !path.includes("..") ? path : null;
    }

    // Compatibilité avec les anciennes URL publiques Supabase.
    const parsed = new URL(value);
    const project = new URL(supabaseUrl);

    if (parsed.origin !== project.origin) return null;

    const marker = "/storage/v1/object/";
    const markerIndex = parsed.pathname.indexOf(marker);

    if (markerIndex === -1) return null;

    const objectPart = parsed.pathname.slice(
      markerIndex + marker.length
    );

    const bucketPrefix = /^(?:public|sign)\/videos\//;

    if (!bucketPrefix.test(objectPart)) return null;

    const encodedPath = objectPart.replace(bucketPrefix, "");
    const path = decodeURIComponent(encodedPath);

    if (!path || path.includes("..")) return null;

    return path;
  } catch {
    return null;
  }
}

function getR2Range(
  header: string | null,
  size: number
):
  | { offset: number; length: number; end: number }
  | null
  | "invalid" {
  if (!header) return null;

  // Une seule plage d'octets est acceptée.
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());

  if (!match || size <= 0) return "invalid";

  const startText = match[1];
  const endText = match[2];

  if (!startText && !endText) return "invalid";

  let start: number;
  let end: number;

  if (!startText) {
    const suffixLength = Number(endText);

    if (
      !Number.isSafeInteger(suffixLength) ||
      suffixLength <= 0
    ) {
      return "invalid";
    }

    start = Math.max(0, size - suffixLength);
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

function validR2Key(value: string): boolean {
  return (
    value.startsWith("videos/") &&
    !value.includes("..") &&
    !value.startsWith("/") &&
    value.length <= 1024
  );
}

async function getR2Bucket(): Promise<R2Bucket | null> {
  try {
    const context = await getCloudflareContext({
      async: true,
    });

    const bucket = (
      context.env as unknown as {
        MOSHI_MEDIA?: R2Bucket;
      }
    ).MOSHI_MEDIA;

    return bucket || null;
  } catch (error) {
    console.error("Accès au stockage R2 indisponible.");
    return null;
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const wantsDownload =
    request.nextUrl.searchParams.get("download") === "1";

  if (
    !id ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      id
    )
  ) {
    return NextResponse.json(
      { error: "Vidéo introuvable." },
      { status: 404 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Configuration du service vidéo indisponible.");

    return NextResponse.json(
      { error: "Service vidéo temporairement indisponible." },
      { status: 503 }
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // 1. Récupération des informations de la vidéo.
    const { data: video, error } = await admin
      .from("videos")
      .select(
        "id, url, status, allow_download, storage_provider, storage_key"
      )
      .eq("id", id)
      .maybeSingle<VideoRow>();

    if (error) {
      console.error("Erreur de lecture des informations vidéo.");

      return NextResponse.json(
        { error: "Impossible de charger cette vidéo." },
        { status: 500 }
      );
    }

    if (!video || video.status !== "published") {
      return NextResponse.json(
        { error: "Vidéo introuvable." },
        { status: 404 }
      );
    }

    // 2. Vérification du droit de téléchargement.
    if (wantsDownload && video.allow_download !== true) {
      return NextResponse.json(
        {
          error:
            "Le créateur n'autorise pas le téléchargement de cette vidéo.",
        },
        { status: 403 }
      );
    }

    // 3. Détermination du fournisseur de stockage.
    const provider = video.storage_provider || "supabase";

    // =====================================================
    // CLOUDFLARE R2
    // =====================================================
    if (provider === "r2") {
      const storageKey = video.storage_key || video.url;

      if (!storageKey || !validR2Key(storageKey)) {
        return NextResponse.json(
          { error: "Chemin de stockage R2 invalide." },
          { status: 404 }
        );
      }

      const bucket = await getR2Bucket();

      if (!bucket) {
        return NextResponse.json(
          { error: "Stockage vidéo temporairement indisponible." },
          { status: 503 }
        );
      }

      // Première lecture pour connaître la taille du fichier
      // et vérifier son existence.
      const initialObject = await bucket.get(storageKey);

      if (!initialObject) {
        return NextResponse.json(
          { error: "Fichier vidéo introuvable." },
          { status: 404 }
        );
      }

      const rangeHeader = request.headers.get("range");
      const range = getR2Range(
        rangeHeader,
        initialObject.size
      );

      if (range === "invalid") {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${initialObject.size}`,
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-store",
          },
        });
      }

      let object: R2ObjectBody = initialObject;
      let status = 200;

      if (range) {
        // Lecture de la seule partie demandée.
        const rangedObject = await bucket.get(storageKey, {
          range: {
            offset: range.offset,
            length: range.length,
          },
        });

        if (!rangedObject) {
          return NextResponse.json(
            { error: "Fichier vidéo indisponible." },
            { status: 404 }
          );
        }

        object = rangedObject;
        status = 206;
      }

      const contentType =
        object.httpMetadata?.contentType ||
        "application/octet-stream";

      const headers = new Headers();

      headers.set("Content-Type", contentType);
      headers.set("Accept-Ranges", "bytes");
      headers.set("X-Content-Type-Options", "nosniff");

      headers.set(
        "Cache-Control",
        "public, max-age=3600, s-maxage=3600"
      );

      headers.set("Content-Length", String(object.size));

      if (object.httpEtag) {
        headers.set("ETag", object.httpEtag);
      }

      if (range) {
        headers.set(
          "Content-Range",
          `bytes ${range.offset}-${range.end}/${initialObject.size}`
        );
      }

      if (wantsDownload) {
        headers.set(
          "Content-Disposition",
          `attachment; filename="moshi-${video.id}.mp4"`
        );
      } else {
        headers.set(
          "Content-Disposition",
          "inline"
        );
      }

      return new NextResponse(object.body, {
        status,
        headers,
      });
    }

    // =====================================================
    // SUPABASE STORAGE : COMPATIBILITÉ ANCIENNES VIDÉOS
    // =====================================================
    if (provider !== "supabase") {
      return NextResponse.json(
        { error: "Fournisseur de stockage non reconnu." },
        { status: 500 }
      );
    }

    const storagePath = getStoragePath(
      video.url,
      supabaseUrl
    );

    if (!storagePath) {
      console.error("Chemin de stockage Supabase invalide.");

      return NextResponse.json(
        { error: "Fichier vidéo indisponible." },
        { status: 404 }
      );
    }

    const { data: signed, error: signingError } =
      await admin.storage
        .from("videos")
        .createSignedUrl(
          storagePath,
          60,
          wantsDownload
            ? { download: `moshi-${video.id}.mp4` }
            : undefined
        );

    if (signingError || !signed?.signedUrl) {
      console.error(
        "Impossible de générer l'accès temporaire à la vidéo."
      );

      return NextResponse.json(
        {
          error:
            "Fichier vidéo temporairement indisponible.",
        },
        { status: 503 }
      );
    }

    return NextResponse.redirect(signed.signedUrl, {
      status: 307,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    console.error("Erreur inattendue dans l'accès vidéo.");

    return NextResponse.json(
      {
        error:
          "Une erreur est survenue pendant le chargement de la vidéo.",
      },
      { status: 500 }
    );
  }
}

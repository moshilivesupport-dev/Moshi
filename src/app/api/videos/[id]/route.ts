
import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VideoRow = {
  id: string;
  url: string;
  status: string | null;
  allow_download: boolean | null;
};

function getStoragePath(value: string, supabaseUrl: string): string | null {
  try {
    // Nouveaux enregistrements : videos.url contient directement le chemin.
    if (!/^https?:\/\//i.test(value)) {
      const path = value.replace(/^\/+/, "");
      return path && !path.includes("..") ? path : null;
    }

    // Anciennes vidéos : URL publique Supabase.
    const parsed = new URL(value);
    const project = new URL(supabaseUrl);

    if (parsed.origin !== project.origin) return null;

    const marker = "/storage/v1/object/";
    const markerIndex = parsed.pathname.indexOf(marker);

    if (markerIndex === -1) return null;

    const objectPart = parsed.pathname.slice(markerIndex + marker.length);
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const wantsDownload = request.nextUrl.searchParams.get("download") === "1";

  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
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
    const { data: video, error } = await admin
      .from("videos")
      .select("id, url, status, allow_download")
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

    // Le droit de téléchargement est contrôlé côté serveur.
    if (wantsDownload && video.allow_download !== true) {
      return NextResponse.json(
        { error: "Le créateur n'autorise pas le téléchargement de cette vidéo." },
        { status: 403 }
      );
    }

    const storagePath = getStoragePath(video.url, supabaseUrl);

    if (!storagePath) {
      console.error("Chemin de stockage vidéo invalide.");

      return NextResponse.json(
        { error: "Fichier vidéo indisponible." },
        { status: 404 }
      );
    }

    const { data: signed, error: signingError } = await admin.storage
      .from("videos")
      .createSignedUrl(
        storagePath,
        60,
        wantsDownload
          ? { download: `moshi-${video.id}.mp4` }
          : undefined
      );

    if (signingError || !signed?.signedUrl) {
      console.error("Impossible de générer l'accès temporaire à la vidéo.");

      return NextResponse.json(
        { error: "Fichier vidéo temporairement indisponible." },
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
      { error: "Une erreur est survenue pendant le chargement de la vidéo." },
      { status: 500 }
    );
  }
}

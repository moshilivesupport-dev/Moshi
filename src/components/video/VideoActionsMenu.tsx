
"use client";

import { useState } from "react";
import {
  MoreHorizontal,
  Repeat2,
  Download,
  Share2,
  BookOpen,
  Loader2,
  Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface VideoActionsMenuProps {
  videoId: string;
  videoUrl: string;
  creatorUsername: string;
  allowDownload: boolean;
}

async function downloadWithWatermark(
  videoUrl: string,
  creatorUsername: string
) {
  if (
    typeof MediaRecorder === "undefined" ||
    typeof HTMLCanvasElement.prototype.captureStream !== "function"
  ) {
    throw new Error(
      "Ton navigateur ne permet pas encore le téléchargement filigrané."
    );
  }

  const response = await fetch(videoUrl);

  if (!response.ok) {
    throw new Error("Impossible de récupérer cette vidéo.");
  }

  const originalBlob = await response.blob();
  const objectUrl = URL.createObjectURL(originalBlob);

  const video = document.createElement("video");
  video.src = objectUrl;
  video.playsInline = true;
  video.muted = false;
  video.preload = "auto";

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () =>
        reject(new Error("Impossible de lire cette vidéo."));
    });

    const width = video.videoWidth || 720;
    const height = video.videoHeight || 1280;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Impossible de préparer le filigrane.");
    }

    const canvasStream = canvas.captureStream(30);

    // Récupération de l'audio lorsque le navigateur le permet.
    const captureStream = (
      video as HTMLVideoElement & {
        captureStream?: () => MediaStream;
        mozCaptureStream?: () => MediaStream;
      }
    ).captureStream ||
      (
        video as HTMLVideoElement & {
          mozCaptureStream?: () => MediaStream;
        }
      ).mozCaptureStream;

    if (captureStream) {
      const originalStream = captureStream.call(video);

      originalStream.getAudioTracks().forEach((track) => {
        canvasStream.addTrack(track);
      });
    }

    const mimeTypes = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];

    const mimeType = mimeTypes.find((type) =>
      MediaRecorder.isTypeSupported(type)
    );

    if (!mimeType) {
      throw new Error(
        "Ce navigateur ne prend pas en charge l'export vidéo nécessaire."
      );
    }

    const recorder = new MediaRecorder(canvasStream, {
      mimeType,
      videoBitsPerSecond: 5_000_000,
    });

    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    const recordingFinished = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        resolve(
          new Blob(chunks, {
            type: recorder.mimeType || mimeType,
          })
        );
      };

      recorder.onerror = () => {
        reject(new Error("Le téléchargement a échoué."));
      };
    });

    const drawFrame = () => {
      if (video.ended || video.paused) return;

      context.drawImage(video, 0, 0, width, height);

      // Filigrane discret en bas à droite.
      const padding = Math.max(18, Math.round(width * 0.025));
      const fontSize = Math.max(20, Math.round(width * 0.035));

      context.save();
      context.font = `bold ${fontSize}px Arial`;
      context.textAlign = "right";
      context.textBaseline = "bottom";

      const watermark = "MOSHI";
      const creator = `@${creatorUsername}`;

      const watermarkY = height - padding * 2;

      context.shadowColor = "rgba(0,0,0,0.85)";
      context.shadowBlur = 7;
      context.fillStyle = "#ffffff";

      context.fillText(watermark, width - padding, watermarkY);

      context.font = `${Math.max(13, Math.round(fontSize * 0.65))}px Arial`;
      context.fillText(
        creator,
        width - padding,
        watermarkY - fontSize * 1.15
      );

      context.restore();

      requestAnimationFrame(drawFrame);
    };

    video.currentTime = 0;
    await video.play();

    recorder.start(250);
    drawFrame();

    await new Promise<void>((resolve) => {
      video.onended = () => resolve();
    });

    if (recorder.state !== "inactive") {
      recorder.stop();
    }

    const finalBlob = await recordingFinished;

    if (finalBlob.size === 0) {
      throw new Error("Le fichier téléchargé est vide.");
    }

    const extension = mimeType.includes("mp4") ? "mp4" : "webm";
    const downloadUrl = URL.createObjectURL(finalBlob);

    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `moshi-${creatorUsername}-${videoUrl
      .split("/")
      .pop()
      ?.split("?")[0] || "video"}.${extension}`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 30_000);
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

export default function VideoActionsMenu({
  videoId,
  videoUrl,
  creatorUsername,
  allowDownload,
}: VideoActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const supabase = createClient();

  const getUser = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      throw new Error("Connecte-toi pour utiliser cette fonctionnalité.");
    }

    return user;
  };

  const handleRepost = async () => {
    try {
      setBusy("repost");

      const user = await getUser();

      const { error } = await supabase
        .from("video_reposts")
        .upsert(
          {
            video_id: videoId,
            user_id: user.id,
          },
          {
            onConflict: "video_id,user_id",
            ignoreDuplicates: true,
          }
        );

      if (error) throw error;

      alert("Vidéo republiée !");
      setOpen(false);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Impossible de republier cette vidéo."
      );
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async () => {
    if (!allowDownload) {
      alert("Le créateur n'autorise pas le téléchargement de cette vidéo.");
      return;
    }

    try {
      setBusy("download");

      await downloadWithWatermark(videoUrl, creatorUsername);

      setOpen(false);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Impossible de télécharger cette vidéo."
      );
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/videos/${videoId}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Vidéo Moshi",
          text: `Découvre cette vidéo de @${creatorUsername} sur Moshi`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Lien copié !");
      }

      setOpen(false);
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        alert("Impossible de partager cette vidéo.");
      }
    }
  };

  const handleAddStory = async () => {
    try {
      setBusy("story");

      const user = await getUser();

      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        media_url: videoUrl,
        media_type: "video",
        caption: `Vidéo de @${creatorUsername}`,
        duration: 5,
        expires_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ).toISOString(),
      });

      if (error) throw error;

      alert("Vidéo ajoutée à ta story pour 24 heures !");
      setOpen(false);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Impossible d'ajouter cette vidéo en story."
      );
    } finally {
      setBusy(null);
    }
  };

  const closeMenu = () => {
    if (!busy) setOpen(false);
  };

  return (
    <div className="relative flex flex-col items-center">
      <button
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={() => setOpen((value) => !value)}
        aria-label="Autres actions"
        aria-expanded={open}
        className="moshi-glass flex h-10 w-10 items-center justify-center rounded-full"
      >
        <MoreHorizontal size={23} className="text-white" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={closeMenu}
            className="fixed inset-0 z-[80] cursor-default"
          />

          <div
            onPointerDown={(event) => event.stopPropagation()}
            className="absolute bottom-12 right-0 z-[90] w-[235px] overflow-hidden rounded-2xl border border-white/15 bg-[#17151d]/95 p-2 text-white shadow-2xl backdrop-blur-xl"
          >
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void handleRepost()}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50"
            >
              {busy === "repost" ? (
                <Loader2 size={19} className="animate-spin" />
              ) : (
                <Repeat2 size={19} />
              )}
              Republier la vidéo
            </button>

            <button
              type="button"
              disabled={!!busy || !allowDownload}
              onClick={() => void handleDownload()}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy === "download" ? (
                <Loader2 size={19} className="animate-spin" />
              ) : allowDownload ? (
                <Download size={19} />
              ) : (
                <Lock size={19} />
              )}

              <span className="flex-1">Télécharger</span>

              {!allowDownload && (
                <span className="text-[10px] text-white/45">
                  Désactivé
                </span>
              )}
            </button>

            <button
              type="button"
              disabled={!!busy}
              onClick={() => void handleShare()}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50"
            >
              <Share2 size={19} />
              Partager
            </button>

            <div className="my-1 border-t border-white/10" />

            <button
              type="button"
              disabled={!!busy}
              onClick={() => void handleAddStory()}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50"
            >
              {busy === "story" ? (
                <Loader2 size={19} className="animate-spin" />
              ) : (
                <BookOpen size={19} />
              )}
              Ajouter en story
            </button>
          </div>
        </>
      )}
    </div>
  );
}

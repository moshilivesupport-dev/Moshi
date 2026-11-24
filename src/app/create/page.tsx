
"use client";

import {
  useState,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  UploadCloud,
  X,
  Loader2,
  Hash,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const POPULAR_HASHTAGS = [
  "Moshi",
  "Togo",
  "Afrique",
  "Musique",
  "Danse",
  "Humour",
  "Tendance",
  "Fashion",
  "Sport",
  "Lifestyle",
];

const MAX_FILE_SIZE = 500 * 1024 * 1024;
const MAX_DURATION = 120;

const ALLOWED_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
];

type UploadedPart = {
  partNumber: number;
  etag: string;
};

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\p{L}\p{N}_]+/gu) || [];

  return [
    ...new Set(
      matches.map((tag) => tag.slice(1).toLocaleLowerCase())
    ),
  ];
}

async function readApiResponse(response: Response) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        `Erreur serveur (${response.status}).`
    );
  }

  if (!data) {
    throw new Error("Réponse invalide du serveur.");
  }

  return data;
}

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");

    let finished = false;

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(objectUrl);
    };

    const finish = (callback: () => void) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      cleanup();
      callback();
    };

    const timeout = window.setTimeout(() => {
      finish(() =>
        reject(
          new Error(
            "Impossible de lire les informations de cette vidéo."
          )
        )
      );
    }, 15000);

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;

      if (!Number.isFinite(duration) || duration <= 0) {
        finish(() =>
          reject(
            new Error("La durée de cette vidéo est invalide.")
          )
        );
        return;
      }

      finish(() => resolve(duration));
    };

    video.onerror = () => {
      finish(() =>
        reject(
          new Error(
            "Impossible de lire cette vidéo. Vérifie son format."
          )
        )
      );
    };

    video.src = objectUrl;
  });
}

export default function CreatePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const hashtags = useMemo(
    () => extractHashtags(caption),
    [caption]
  );

  useEffect(() => {
    let cancelled = false;

    const checkUser = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (authError || !user) {
        router.push("/auth/login");
        return;
      }

      setUserId(user.id);
    };

    void checkUser();

    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setError(null);

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError(
        "Format non accepté. Utilise MP4, MOV, WebM ou M4V."
      );
      event.target.value = "";
      return;
    }

    if (selectedFile.size <= 0) {
      setError("Le fichier vidéo est vide.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError("La vidéo ne doit pas dépasser 500 Mo.");
      event.target.value = "";
      return;
    }

    try {
      const videoDuration = await getVideoDuration(selectedFile);

      if (videoDuration > MAX_DURATION) {
        setError(
          "La vidéo ne doit pas dépasser 2 minutes (120 secondes)."
        );
        event.target.value = "";
        return;
      }

      const newPreviewUrl = URL.createObjectURL(selectedFile);

      setFile(selectedFile);
      setPreviewUrl(newPreviewUrl);
      setDuration(Math.ceil(videoDuration));
      setProgress(0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de vérifier cette vidéo."
      );
      event.target.value = "";
    }
  };

  const removeVideo = () => {
    setFile(null);
    setPreviewUrl(null);
    setDuration(null);
    setProgress(0);
    setError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const insertHashtag = (tag: string) => {
    const cleanTag = tag.replace(/^#/, "").replace(/\s+/g, "");

    if (!cleanTag) return;

    const addition = `#${cleanTag}`;
    const separator =
      caption.length > 0 && !caption.endsWith(" ") ? " " : "";

    setCaption((previous) => `${previous}${separator}${addition} `);
  };

  const handleUpload = async () => {
    if (!file || !userId || uploading) return;

    if (duration === null || duration > MAX_DURATION) {
      setError("La durée de la vidéo est invalide.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    let sessionId: string | null = null;

    try {
      // Récupération du jeton de connexion.
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error(
          "Ta session a expiré. Reconnecte-toi puis réessaie."
        );
      }

      const authorization = {
        Authorization: `Bearer ${session.access_token}`,
      };

      // 1. Création de la session multipart R2.
      const createResponse = await fetch("/api/videos/upload", {
        method: "POST",
        headers: {
          ...authorization,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create",
          fileSize: file.size,
          mimeType: file.type,
          durationSeconds: duration,
        }),
      });

      const uploadSession = await readApiResponse(createResponse);

      sessionId = uploadSession.sessionId;

      if (!sessionId || !uploadSession.partSize) {
        throw new Error(
          "Le serveur n'a pas correctement créé la session d'envoi."
        );
      }

      const partSize = Number(uploadSession.partSize);
      const expectedParts = Number(uploadSession.expectedParts);

      if (
        !Number.isFinite(partSize) ||
        partSize <= 0 ||
        !Number.isInteger(expectedParts) ||
        expectedParts <= 0
      ) {
        throw new Error("Paramètres d'envoi invalides.");
      }

      // 2. Envoi séquentiel des morceaux vers R2.
      // Un seul morceau est envoyé à la fois pour limiter
      // l'utilisation de la mémoire sur les téléphones.
      const uploadedParts: UploadedPart[] = [];

      for (
        let partNumber = 1;
        partNumber <= expectedParts;
        partNumber++
      ) {
        const start = (partNumber - 1) * partSize;
        const end = Math.min(start + partSize, file.size);
        const chunk = file.slice(start, end);

        const partResponse = await fetch(
          `/api/videos/upload?sessionId=${encodeURIComponent(
            sessionId
          )}&partNumber=${partNumber}`,
          {
            method: "PUT",
            headers: {
              ...authorization,
              "Content-Type": "application/octet-stream",
            },
            body: chunk,
          }
        );

        const partResult = await readApiResponse(partResponse);

        if (!partResult.etag) {
          throw new Error(
            `Le morceau ${partNumber} n'a pas été confirmé par le serveur.`
          );
        }

        uploadedParts.push({
          partNumber,
          etag: partResult.etag,
        });

        setProgress(
          Math.round((partNumber / expectedParts) * 90)
        );
      }

      // 3. Finalisation R2 et création de la vidéo dans Supabase.
      const completeResponse = await fetch("/api/videos/upload", {
        method: "POST",
        headers: {
          ...authorization,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "complete",
          sessionId,
          parts: uploadedParts,
          caption: caption.trim(),
          durationSeconds: duration,
        }),
      });

      const completeResult = await readApiResponse(
        completeResponse
      );

      if (!completeResult.success || !completeResult.videoId) {
        throw new Error(
          "La vidéo a été envoyée, mais sa publication n'a pas été confirmée."
        );
      }

      setProgress(100);

      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error("Erreur publication vidéo :", err);

      // En cas d'échec, on demande au serveur d'annuler
      // la session multipart si elle a déjà été créée.
      if (sessionId) {
        try {
          await fetch(
            `/api/videos/upload?sessionId=${encodeURIComponent(
              sessionId
            )}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${
                  (
                    await supabase.auth.getSession()
                  ).data.session?.access_token || ""
                }`,
              },
            }
          );
        } catch (cleanupError) {
          console.error(
            "Erreur annulation de l'envoi R2 :",
            cleanupError
          );
        }
      }

      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue pendant la publication."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] flex-col bg-[#F8F7FB]">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-4 shadow-sm">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-full"
          disabled={uploading}
        >
          <ArrowLeft className="h-6 w-6 text-gray-800" />
        </button>

        <h1 className="text-lg font-bold text-gray-900">
          Nouvelle vidéo
        </h1>

        <div className="w-10" />
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col p-5">
        {!file ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-[9/16] max-h-[55vh] w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-gray-300 bg-white shadow-sm transition hover:border-purple-400"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-50 text-purple-600">
              <UploadCloud size={32} />
            </div>

            <div className="text-center">
              <p className="font-bold text-gray-900">
                Sélectionner une vidéo
              </p>

              <p className="mt-1 text-xs text-gray-500">
                MP4, MOV, WebM ou M4V
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Maximum 500 Mo · 2 minutes
              </p>
            </div>
          </button>
        ) : (
          <div className="relative mx-auto aspect-[9/16] max-h-[55vh] w-full overflow-hidden rounded-3xl bg-black shadow-lg">
            {previewUrl && (
              <video
                src={previewUrl}
                controls
                playsInline
                className="h-full w-full object-contain"
              />
            )}

            <button
              type="button"
              onClick={removeVideo}
              disabled={uploading}
              aria-label="Supprimer la vidéo"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
          onChange={(event) => void handleFileSelect(event)}
          disabled={uploading}
          className="hidden"
        />

        {file && duration !== null && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs font-medium text-gray-500">
            <Clock3 size={15} />
            <span>
              Durée : {Math.floor(duration / 60)} min{" "}
              {duration % 60} s
            </span>
            <span>·</span>
            <span>
              {(file.size / (1024 * 1024)).toFixed(1)} Mo
            </span>
          </div>
        )}

        <section className="mt-6">
          <label
            htmlFor="video-caption"
            className="ml-1 text-sm font-bold text-gray-900"
          >
            Description de la vidéo
          </label>

          <textarea
            id="video-caption"
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            placeholder="Raconte-nous quelque chose... #Moshi #Togo"
            rows={4}
            maxLength={2200}
            disabled={uploading}
            className="mt-2 w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-purple-500 disabled:opacity-60"
          />

          <div className="mt-1 flex justify-between px-1 text-xs text-gray-400">
            <span>{hashtags.length} hashtag(s)</span>
            <span>{caption.length}/2200</span>
          </div>
        </section>

        <section className="mt-5">
          <div className="mb-3 flex items-center gap-2">
            <Hash size={18} className="text-purple-600" />

            <h2 className="text-sm font-bold text-gray-900">
              Hashtags populaires
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {POPULAR_HASHTAGS.map((tag) => {
              const alreadyAdded = hashtags.includes(
                tag.toLocaleLowerCase()
              );

              return (
                <button
                  key={tag}
                  type="button"
                  disabled={alreadyAdded || uploading}
                  onClick={() => insertHashtag(tag)}
                  className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                    alreadyAdded
                      ? "border-purple-200 bg-purple-50 text-purple-400"
                      : "border-gray-200 bg-white text-gray-700 hover:border-purple-400 hover:text-purple-600"
                  }`}
                >
                  {alreadyAdded ? "✓ " : "+"}#{tag}
                </button>
              );
            })}
          </div>
        </section>

        {hashtags.length > 0 && (
          <section className="mt-5 rounded-2xl border border-purple-100 bg-purple-50 p-4">
            <p className="mb-2 text-xs font-bold text-purple-800">
              Aperçu des hashtags
            </p>

            <div className="flex flex-wrap gap-2">
              {hashtags.map((tag) => (
                <Link
                  key={tag}
                  href={`/hashtag/${encodeURIComponent(tag)}`}
                  className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-purple-700"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          </section>
        )}

        {error && (
          <div className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <div className="mt-auto pb-6 pt-8">
          {uploading && (
            <div className="mb-4">
              <div className="mb-2 flex justify-between text-xs font-semibold text-gray-600">
                <span>Envoi de ta vidéo vers Moshi...</span>
                <span>{progress}%</span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-purple-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleUpload()}
            disabled={!file || !userId || uploading}
            className="moshi-gradient flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <CheckCircle2 size={20} />
                Publier la vidéo
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}

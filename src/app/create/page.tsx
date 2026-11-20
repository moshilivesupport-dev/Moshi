
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
  Play,
  Hash,
  CheckCircle2,
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

function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\p{L}\p{N}_]+/gu) || [];

  return [
    ...new Set(
      matches.map((tag) => tag.slice(1).toLocaleLowerCase())
    ),
  ];
}

export default function CreatePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
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

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("video/")) {
      setError("Veuillez sélectionner un fichier vidéo.");
      event.target.value = "";
      return;
    }

    const newPreviewUrl = URL.createObjectURL(selectedFile);

    setFile(selectedFile);
    setPreviewUrl(newPreviewUrl);
    setError(null);
  };

  const removeVideo = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(null);
    setPreviewUrl(null);

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

    if (file.size > 500 * 1024 * 1024) {
      setError("La vidéo ne doit pas dépasser 500 Mo.");
      return;
    }

    setUploading(true);
    setError(null);

    let uploadedPath: string | null = null;

    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) throw uploadError;

      uploadedPath = fileName;

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("videos")
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from("videos")
        .insert({
          user_id: userId,
          url: publicUrl,
          caption: caption.trim(),
          status: "published",
        });

      if (dbError) throw dbError;

      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error("Erreur publication vidéo :", err);

      // Supprime le fichier du Storage si son enregistrement
      // dans la table videos a échoué.
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage
          .from("videos")
          .remove([uploadedPath]);

        if (cleanupError) {
          console.error("Erreur nettoyage Storage :", cleanupError);
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
                MP4, MOV, WebM
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
              aria-label="Supprimer la vidéo"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />

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
            className="mt-2 w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-purple-500"
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
                  disabled={alreadyAdded}
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
          <button
            type="button"
            onClick={() => void handleUpload()}
            disabled={!file || !userId || uploading}
            className="moshi-gradient flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-bold text-white shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Publication en cours...
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

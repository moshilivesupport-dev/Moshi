"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Upload, X, Film, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_DURATION_SECONDS = 45;
const MAX_FILE_SIZE_MB = 80;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

interface VideoUploadFormProps {
  className?: string;
}

export default function VideoUploadForm({ className }: VideoUploadFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const reset = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setDuration(null);
    setTitle("");
    setDescription("");
    setError(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [previewUrl]);

  const validateAndSetFile = useCallback(async (selected: File) => {
    setError(null);

    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError("Format non supporté. Utilisez MP4, WebM ou QuickTime.");
      return;
    }

    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setError(`Fichier trop lourd (max ${MAX_FILE_SIZE_MB} Mo).`);
      return;
    }

    const url = URL.createObjectURL(selected);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve();
      };
      video.onerror = () => reject(new Error("Impossible de lire la vidéo"));
    });

    const dur = Math.round(video.duration);

    if (dur > MAX_DURATION_SECONDS) {
      setError(`La vidéo dure ${dur}s. Maximum autorisé : ${MAX_DURATION_SECONDS} secondes.`);
      URL.revokeObjectURL(url);
      return;
    }

    if (dur <= 0) {
      setError("Durée de la vidéo invalide.");
      URL.revokeObjectURL(url);
      return;
    }

    setFile(selected);
    setPreviewUrl(url);
    setDuration(dur);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) validateAndSetFile(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const selected = e.dataTransfer.files?.[0];
    if (selected) validateAndSetFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || duration === null) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError("Vous devez être connecté pour publier une vidéo.");
        setUploading(false);
        return;
      }

      // Upload vers Storage
      const ext = file.name.split(".").pop() || "mp4";
      const filePath = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      setProgress(70);

      const {
        data: { publicUrl },
      } = supabase.storage.from("videos").getPublicUrl(filePath);

      // Insertion en base
      const { data: video, error: insertError } = await supabase
        .from("videos")
        .insert({
          user_id: user.id,
          title: title.trim() || null,
          description: description.trim() || null,
          video_url: publicUrl,
          duration,
          is_public: true,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      setProgress(100);
      router.push(`/videos/${video.id}`);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erreur lors de l'upload. Réessayez.");
      setUploading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-6 max-w-lg mx-auto", className)}
    >
      {/* Zone d'upload */}
      {!previewUrl ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-neutral-700 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-red-500/60 hover:bg-neutral-900/40 transition-colors"
        >
          <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center">
            <Upload className="w-7 h-7 text-neutral-400" />
          </div>
          <div className="text-center">
            <p className="font-medium text-white">Glissez une vidéo ou cliquez</p>
            <p className="text-sm text-neutral-500 mt-1">
              MP4, WebM, MOV · max {MAX_DURATION_SECONDS}s · {MAX_FILE_SIZE_MB} Mo
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[420px]">
          <video
            ref={videoPreviewRef}
            src={previewUrl}
            controls
            playsInline
            className="w-full h-full object-contain"
          />
          <button
            type="button"
            onClick={reset}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90 transition"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          {duration !== null && (
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/70 text-xs text-white flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5" />
              {duration}s
            </div>
          )}
        </div>
      )}

      {/* Champs */}
      {previewUrl && (
        <>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-neutral-400 mb-1.5 block">
                Titre (optionnel)
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Donnez un titre à votre vidéo"
                maxLength={100}
                disabled={uploading}
              />
            </div>
            <div>
              <label className="text-sm text-neutral-400 mb-1.5 block">
                Description (optionnel)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre vidéo..."
                maxLength={500}
                rows={3}
                disabled={uploading}
                className="w-full rounded-xl bg-neutral-900 border border-neutral-700 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
              />
            </div>
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-neutral-500 text-center">
                Upload en cours... {progress}%
              </p>
            </div>
          )}
        </>
      )}

      {/* Erreur */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Actions */}
      {previewUrl && (
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={reset}
            disabled={uploading}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button type="submit" disabled={uploading || !file} className="flex-1">
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publication...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Publier
              </>
            )}
          </Button>
        </div>
      )}
    </form>
  );
}

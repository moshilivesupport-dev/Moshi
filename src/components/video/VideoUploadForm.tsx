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

export default function VideoUploadForm({ className }: { className?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const validateAndSetFile = useCallback(
    async (selected: File) => {
      setError(null);
      if (!ACCEPTED_TYPES.includes(selected.type)) {
        setError("Format non supporté. Utilisez MP4, WebM ou MOV.");
        return;
      }
      if (selected.size > MAX_FILE_SIZE_BYTES) {
        setError(`Fichier trop lourd (max ${MAX_FILE_SIZE_MB} Mo).`);
        return;
      }

      const objectUrl = URL.createObjectURL(selected);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = objectUrl;

      try {
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error("Lecture impossible"));
        });
        const dur = Math.round(video.duration || 0);
        if (dur <= 0) {
          setError("Durée invalide.");
          URL.revokeObjectURL(objectUrl);
          return;
        }
        if (dur > MAX_DURATION_SECONDS) {
          setError(`Max ${MAX_DURATION_SECONDS}s (actuellement ${dur}s).`);
          URL.revokeObjectURL(objectUrl);
          return;
        }
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setFile(selected);
        setPreviewUrl(objectUrl);
        setDuration(dur);
      } catch {
        URL.revokeObjectURL(objectUrl);
        setError("Impossible de lire la vidéo.");
      }
    },
    [previewUrl]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || duration == null) return;
    setUploading(true);
    setError(null);
    setProgress(10);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login?next=/videos/new");
        return;
      }

      const ext = file.name.split(".").pop() || "mp4";
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      setProgress(30);

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(filePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      setProgress(70);
      const {
        data: { publicUrl },
      } = supabase.storage.from("videos").getPublicUrl(filePath);

      const caption =
        [title.trim(), description.trim()].filter(Boolean).join(" — ") || null;

      // Schéma migration 010
      const { data: video, error: insertError } = await supabase
        .from("videos")
        .insert({
          user_id: user.id,
          url: publicUrl,
          caption,
          duration_seconds: duration,
          status: "published",
          view_count: 0,
          like_count: 0,
          comment_count: 0,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;
      setProgress(100);
      router.push(`/videos/${video.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur upload");
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-6 max-w-lg mx-auto", className)}>
      {!previewUrl ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) void validateAndSetFile(f);
          }}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-neutral-700 rounded-2xl p-10 flex flex-col items-center gap-4 cursor-pointer hover:border-red-500/60"
        >
          <Upload className="w-7 h-7 text-neutral-400" />
          <p className="text-white font-medium">Glissez une vidéo ou cliquez</p>
          <p className="text-sm text-neutral-500">
            MP4 / WebM / MOV · max {MAX_DURATION_SECONDS}s
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void validateAndSetFile(f);
            }}
          />
        </div>
      ) : (
        <>
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[420px]">
            <video src={previewUrl} controls playsInline className="w-full h-full object-contain" />
            <button
              type="button"
              onClick={reset}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/70 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            {duration != null && (
              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/70 text-xs text-white flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" />
                {duration}s
              </div>
            )}
          </div>

          <Input
            label="Titre (optionnel)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            disabled={uploading}
          />
          <div className="space-y-1.5">
            <label className="block text-sm text-neutral-300">Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={uploading}
              className="w-full rounded-xl bg-neutral-900 border border-neutral-700 px-4 py-3 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-500/50"
            />
          </div>

          {uploading && (
            <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
              <div className="h-full bg-red-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </>
      )}

      {error && (
        <div className="flex gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {previewUrl && (
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={reset} disabled={uploading} className="flex-1">
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
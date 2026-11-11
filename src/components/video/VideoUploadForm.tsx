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

    const objectUrl = URL.createObjectURL(selected);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = objectUrl;

    try {
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error("Impossible de lire la vidéo"));
      });

      const dur = Math.round(video.duration || 0);

      if (!dur || dur <= 0) {
        setError("Durée de vidéo invalide.");
        URL.revokeObjectURL(objectUrl);
        return;
      }

      if (dur > MAX_DURATION_SECONDS) {
        setError(`Vidéo trop longue (${dur}s). Maximum ${MAX_DURATION_SECONDS}s.`);
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
  }, [previewUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) await validateAndSetFile(selected);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const selected = e.dataTransfer.files?.[0];
    if (selected) await validateAndSetFile(selected);
  };

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
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setProgress(70);

      const {
        data: { publicUrl },
      } = supabase.storage.from("videos").getPublicUrl(filePath);

      // Schéma migration 010
      const caption =
        [title.trim(), description.trim()].filter(Boolean).join(" — ") || null;

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
      const message =
        err instanceof Error ? err.message : "Erreur lors de l'upload. Réessayez.";
      setError(message);
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-6 max-w-lg mx-auto", className)}
    >
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
        <>
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

          <div className="space-y-4">
            <Input
              label="Titre (optionnel)"
              value={title}
              onChange={(e) => set
"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Upload, Video, X, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

const MAX_SECONDS = 45;
const MAX_SIZE_MB = 80;

// Extension déduite du type MIME (jamais du nom de fichier choisi par l'utilisateur)
const EXT_BY_TYPE: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

interface Props {
  userId: string;
}

export function VideoUploadForm({ userId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const reset = () => {
    setFile(null);
    setPreview(null);
    setDuration(null);
    setError(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!EXT_BY_TYPE[f.type]) {
      setError("Format non pris en charge (MP4, WebM ou MOV)");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Fichier trop lourd (max ${MAX_SIZE_MB} Mo)`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const url = URL.createObjectURL(f);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const d = video.duration;
      if (!isFinite(d) || d <= 0) {
        setError("Impossible de lire la durée de la vidéo");
        return;
      }
      if (d > MAX_SECONDS) {
        setError(`Vidéo trop longue (${d.toFixed(1)}s). Maximum ${MAX_SECONDS} secondes.`);
        setFile(null);
        setPreview(null);
        setDuration(null);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      setFile(f);
      setPreview(url);
      setDuration(d);
      setError(null);
    };
    video.onerror = () => setError("Vidéo illisible");
  };

  const submit = async () => {
    if (!file || duration == null) return;
    if (duration > MAX_SECONDS) {
      setError(`Maximum ${MAX_SECONDS} secondes`);
      return;
    }
    setLoading(true);
    setError(null);
    setProgress(10);

    try {
      const ext = EXT_BY_TYPE[file.type] || "mp4";
      const path = `${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

      setProgress(30);
      const { error: upErr } = await supabase.storage
        .from("videos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      setProgress(70);
      const { data: urlData } = supabase.storage.from("videos").getPublicUrl(path);

      const { data: row, error: insErr } = await supabase
        .from("videos")
        .insert({
          user_id: userId,
          url: urlData.publicUrl,
          caption: caption.trim() || null,
          duration_seconds: Math.round(duration * 100) / 100,
          status: "published",
        })
        .select("id")
        .single();
      if (insErr) {
        // On ne laisse pas un fichier orphelin dans le Storage
        await supabase.storage.from("videos").remove([path]);
        throw insErr;
      }

      setProgress(100);
      router.push(`/videos/${row.id}`);
    } catch (e: any) {
      setError(e.message || "Échec de l'upload");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {!preview ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full aspect-[9/16] max-h-[420px] rounded-2xl border-2 border-dashed border-white/15 bg-anthracite flex flex-col items-center justify-center gap-3 hover:border-coral/50 transition"
        >
          <div className="w-14 h-14 rounded-full bg-coral/15 flex items-center justify-center">
            <Upload className="w-6 h-6 text-coral" />
          </div>
          <p className="text-sm text-white font-medium">Choisir une vidéo</p>
          <p className="text-xs text-muted">MP4 / WebM · max {MAX_SECONDS}s · max {MAX_SIZE_MB} Mo</p>
        </button>
      ) : (
        <div className="relative aspect-[9/16] max-h-[420px] rounded-2xl overflow-hidden bg-black mx-auto">
          <video
            ref={videoRef}
            src={preview}
            className="w-full h-full object-contain"
            controls
            playsInline
          />
          <button
            type="button"
            onClick={reset}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
          {duration != null && (
            <span className="absolute bottom-3 left-3 text-xs bg-black/70 px-2 py-1 rounded-full">
              {duration.toFixed(1)}s / {MAX_SECONDS}s
            </span>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={onFile}
      />

      <Input
        label="Légende"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Décris ta vidéo…"
        maxLength={200}
      />

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading && (
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-coral transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      )}

      <Button
        className="w-full"
        variant="gold"
        loading={loading}
        disabled={!file || duration == null || duration > MAX_SECONDS}
        onClick={submit}
      >
        <Video className="w-4 h-4 mr-2" /> Publier la vidéo
      </Button>

      <p className="text-[11px] text-muted text-center">
        Ouvert à tous les comptes (acheteurs et vendeurs). Durée max strictement limitée à {MAX_SECONDS} secondes.
      </p>
    </div>
  );
}

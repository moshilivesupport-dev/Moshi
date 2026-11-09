"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resizeToJpeg } from "@/lib/image";
import { Button } from "@/components/ui/Button";
import { ImagePlus } from "lucide-react";

const MAX_VIDEO_MB = 30;
const MAX_VIDEO_SECONDS = 30;
const VIDEO_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

interface Media {
  blob: Blob;
  type: "image" | "video";
  ext: string;
  contentType: string;
}

export function StoryForm({ userId }: { userId: string }) {
  const [media, setMedia] = useState<Media | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const setNewMedia = (m: Media, url: string) => {
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return url;
    });
    setMedia(m);
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      if (file.type.startsWith("video/")) {
        const ext = VIDEO_EXT[file.type];
        if (!ext) throw new Error("Vidéo non prise en charge (MP4, WebM ou MOV).");
        if (file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`Vidéo trop lourde (max ${MAX_VIDEO_MB} Mo).`);
        const url = URL.createObjectURL(file);
        const duration = await new Promise<number>((resolve, reject) => {
          const v = document.createElement("video");
          v.preload = "metadata";
          v.onloadedmetadata = () => resolve(v.duration);
          v.onerror = () => reject(new Error("Vidéo illisible."));
          v.src = url;
        });
        if (!isFinite(duration) || duration > MAX_VIDEO_SECONDS + 0.5) {
          URL.revokeObjectURL(url);
          throw new Error(`Vidéo trop longue (max ${MAX_VIDEO_SECONDS} secondes).`);
        }
        setNewMedia({ blob: file, type: "video", ext, contentType: file.type }, url);
      } else {
        const blob = await resizeToJpeg(file, 1080);
        setNewMedia({ blob, type: "image", ext: "jpg", contentType: "image/jpeg" }, URL.createObjectURL(blob));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fichier illisible.");
    } finally {
      e.target.value = "";
    }
  };

  const publish = async () => {
    if (!media) {
      setError("Choisissez une photo ou une vidéo.");
      return;
    }
    setLoading(true);
    setError(null);
    const path = `${userId}/${Date.now()}.${media.ext}`;
    try {
      const { error: upErr } = await supabase.storage
        .from("stories")
        .upload(path, media.blob, { contentType: media.contentType });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from("stories").getPublicUrl(path);
      const { error: insErr } = await supabase.from("stories").insert({
        seller_id: userId,
        media_url: urlData.publicUrl,
        media_type: media.type,
        caption: caption.trim() || null,
        expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      });
      if (insErr) {
        await supabase.storage.from("stories").remove([path]);
        throw insErr;
      }
      router.push("/stories");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la publication");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block cursor-pointer">
        <div className="aspect-[9/16] max-h-[55vh] mx-auto rounded-2xl border-2 border-dashed border-white/15 bg-onyx overflow-hidden flex items-center justify-center">
          {preview ? (
            media?.type === "video" ? (
              <video src={preview} className="w-full h-full object-cover" muted playsInline controls />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="w-full h-full object-cover" />
            )
          ) : (
            <div className="text-center text-muted text-sm px-6">
              <ImagePlus className="w-8 h-8 mx-auto mb-2" />
              Touchez pour choisir une photo ou une vidéo (30 s max)
            </div>
          )}
        </div>
        <input type="file" accept="image/*,video/*" onChange={onPick} className="hidden" />
      </label>

      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        maxLength={200}
        placeholder="Légende (optionnel)"
        className="input-field"
      />

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</div>
      )}

      <Button className="w-full" variant="gold" loading={loading} disabled={!media} onClick={publish}>
        Publier la story
      </Button>
      <p className="text-center text-xs text-muted">Elle disparaît automatiquement après 24 h.</p>
    </div>
  );
}

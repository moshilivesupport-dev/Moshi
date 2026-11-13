"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Image as ImageIcon, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function NewStoryPage() {
  const router = useRouter();
  const supabase = createClient();
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const publishStory = async () => {
    if (!file) return;
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      // Uploader le fichier
      const fileName = `${user.id}/story_${Date.now()}.${file.name.split(".").pop()}`;
      await supabase.storage.from("stories").upload(fileName, file);
      const { data: urlData } = supabase.storage.from("stories").getPublicUrl(fileName);

      // Insérer en base
      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        media_url: urlData.publicUrl,
        caption: caption || null,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
      });

      if (error) throw error;

      router.push("/");
    } catch (err) {
      alert("Erreur lors de la publication de la story");
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2">
          <X className="w-7 h-7 text-white" />
        </button>
        <h1 className="text-white font-semibold">Nouvelle Story</h1>
        <div className="w-10" />
      </div>

      {/* Aperçu ou sélecteur */}
      <div className="absolute inset-0 flex items-center justify-center">
        {preview ? (
          <img src={preview} alt="Preview" className="max-w-full max-h-full object-contain" />
        ) : (
          <label className="flex flex-col items-center gap-3 cursor-pointer">
            <div className="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center">
              <ImageIcon className="w-10 h-10 text-neutral-400" />
            </div>
            <p className="text-white text-sm">Choisir une photo/vidéo</p>
            <input type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />
          </label>
        )}
      </div>

      {/* Barre de publication */}
      {preview && (
        <div className="absolute bottom-0 left-0 right-0 z-30 p-4 bg-black/80">
          <input
            type="text"
            placeholder="Ajouter une légende..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full bg-neutral-800 text-white p-3 rounded-lg mb-3"
          />
          <button
            onClick={publishStory}
            disabled={uploading}
            className="w-full bg-red-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
          >
            {uploading ? "Publication..." : <><Send className="w-5 h-5" /> Publier la story</>}
          </button>
        </div>
      )}
    </div>
  );
}
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Upload, Loader2, AlertCircle } from "lucide-react";

const MAX_DURATION_SECONDS = 120; // ⏱️ 2 minutes max

export default function VideoUploadForm() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Vérification poids (max 100 Mo)
    if (selectedFile.size > 100 * 1024 * 1024) {
      setError("Le fichier est trop lourd (max 100 Mo).");
      return;
    }

    // Vérification durée (max 2 min)
    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';
    videoElement.src = URL.createObjectURL(selectedFile);
    
    try {
      const duration = await new Promise<number>((resolve, reject) => {
        videoElement.onloadedmetadata = () => resolve(videoElement.duration);
        videoElement.onerror = () => reject(new Error("Impossible de lire la vidéo"));
      });
      
      URL.revokeObjectURL(videoElement.src);

      if (duration > MAX_DURATION_SECONDS) {
        setError(`La vidéo dépasse 2 minutes (${Math.round(duration)}s). Limite : 120s.`);
        setFile(null);
        setVideoDuration(null);
        return;
      }

      setFile(selectedFile);
      setVideoDuration(Math.round(duration));
      setError(null);
    } catch (err) {
      URL.revokeObjectURL(videoElement.src);
      setError("Fichier vidéo invalide.");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setProgress(10);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Vous devez être connecté.");

      setProgress(30);

      // Upload Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;
      setProgress(60);

      const { data: urlData } = supabase.storage.from("videos").getPublicUrl(fileName);
      setProgress(80);

      // Insertion BDD
      const { error: dbError } = await supabase.from("videos").insert({
        user_id: user.id,
        url: urlData.publicUrl,
        caption: caption.trim() || null,
        is_public: isPublic,
        status: "published",
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        duration_seconds: videoDuration || 0,
      });

      if (dbError) throw dbError;

      setProgress(100);
      setTimeout(() => router.push("/"), 1000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Une erreur est survenue lors de l'upload.");
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-neutral-900 rounded-2xl border border-neutral-800">
      <h2 className="text-xl font-bold text-white mb-2">Publier une vidéo</h2>
      <p className="text-xs text-neutral-400 mb-6">Maximum 2 minutes · 100 Mo</p>

      <div 
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-neutral-700 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-neutral-500 transition mb-6"
      >
        {file ? (
          <div className="text-center">
            <p className="text-white font-semibold">{file.name}</p>
            <p className="text-sm text-neutral-400">{(file.size / 1024 / 1024).toFixed(2)} Mo</p>
            {videoDuration && (
              <p className="text-xs text-green-500 mt-1">⏱️ {videoDuration}s (OK)</p>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); setFile(null); setVideoDuration(null); }}
              className="mt-2 text-red-500 text-sm hover:underline"
            >
              Supprimer
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-10 h-10 text-neutral-500 mb-2" />
            <p className="text-neutral-400 text-sm">Cliquez pour sélectionner une vidéo</p>
            <p className="text-neutral-600 text-xs mt-1">MP4, WebM (Max 2 min)</p>
          </>
        )}
        <input 
          ref={fileInputRef} 
          type="file" 
          accept="video/mp4,video/webm" 
          onChange={handleFileChange} 
          className="hidden" 
        />
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-neutral-400 mb-1">Légende</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={150}
            rows={3}
            className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
            placeholder="Décrivez votre vidéo..."
          />
          <p className="text-right text-xs text-neutral-600 mt-1">{caption.length}/150</p>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <div 
            onClick={() => setIsPublic(!isPublic)}
            className={`w-10 h-6 rounded-full p-1 transition-colors ${isPublic ? 'bg-red-500' : 'bg-neutral-700'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isPublic ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
          <span className="text-sm text-white">Rendre public</span>
        </label>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full bg-red-500 hover:bg-red-600 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
      >
        {uploading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Publication... {progress}%
          </>
        ) : (
          "Publier la vidéo"
        )}
      </button>
    </div>
  );
}
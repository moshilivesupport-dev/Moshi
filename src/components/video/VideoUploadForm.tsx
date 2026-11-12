"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Upload, X, Film, AlertCircle, CheckCircle } from "lucide-react";

interface VideoUploadFormProps {
  userId: string;
}

export default function VideoUploadForm({ userId }: VideoUploadFormProps) {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 1. Gérer la sélection du fichier
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Vérification du format
    const validTypes = ["video/mp4", "video/webm", "video/quicktime"];
    if (!validTypes.includes(selectedFile.type)) {
      setError("Format non supporté. Utilisez MP4, WebM ou MOV.");
      return;
    }

    // Vérification de la taille (max 100MB pour l'exemple)
    if (selectedFile.size > 100 * 1024 * 1024) {
      setError("La vidéo est trop lourde (max 100MB).");
      return;
    }

    // Créer l'URL de prévisualisation locale
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    setFile(selectedFile);
    setError(null);

    // Vérifier la durée une fois les métadonnées chargées
    if (videoPreviewRef.current) {
      videoPreviewRef.current.onloadedmetadata = () => {
        if (videoPreviewRef.current && videoPreviewRef.current.duration > 45) {
          setError("La vidéo dépasse 45 secondes.");
          setFile(null);
          setPreviewUrl(null);
        }
      };
    }
  };

  // 2. Gérer l'upload vers Supabase
  const handleUpload = async () => {
    if (!file || !userId) return;

    setUploading(true);
    setError(null);
    setProgress(10);

    try {
      // Nom de fichier unique
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Upload vers le bucket 'videos'
      const { data, error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setProgress(60);

      // Récupérer l'URL publique
      const { data: urlData } = supabase.storage.from("videos").getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      setProgress(80);

      // Sauvegarder les métadonnées dans la table 'videos'
      const { error: dbError } = await supabase.from("videos").insert({
        user_id: userId,
        url: publicUrl,
        caption: caption.trim() || null,
        is_public: isPublic,
        status: "published", // ou 'processing' si vous ajoutez un traitement serveur
        view_count: 0,
        like_count: 0,
        comment_count: 0,
      });

      if (dbError) throw dbError;

      setProgress(100);
      
      // Redirection vers le feed ou le profil après 1s
      setTimeout(() => {
        router.push("/");
      }, 1000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Une erreur est survenue lors de l'upload.");
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Zone de sélection / Prévisualisation */}
      <div className="relative aspect-[9/16] max-h-[500px] mx-auto rounded-2xl overflow-hidden bg-neutral-900 border-2 border-dashed border-neutral-700 flex flex-col items-center justify-center">
        {previewUrl ? (
          <>
            <video
              ref={videoPreviewRef}
              src={previewUrl}
              controls
              className="w-full h-full object-contain bg-black"
            />
            <button
              onClick={() => {
                setFile(null);
                setPreviewUrl(null);
                setError(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center hover:bg-black/80 transition"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-3 p-6 text-center group"
          >
            <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
              <Film className="w-8 h-8 text-neutral-400 group-hover:text-red-500 transition-colors" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-1">Sélectionner une vidéo</p>
              <p className="text-xs text-neutral-500">MP4, WebM ou MOV · Max 45s · Max 100MB</p>
            </div>
          </button>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Légende (Caption) */}
      <div>
        <label className="block text-sm font-semibold mb-2 text-white">Légende</label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Décrivez votre vidéo... #moshi #liveshopping"
          maxLength={300}
          rows={3}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-red-500/50 transition resize-none"
        />
        <p className="text-xs text-neutral-500 mt-1 text-right">{caption.length}/300</p>
      </div>

      {/* Visibilité */}
      <div className="flex items-center justify-between bg-neutral-900 p-4 rounded-xl border border-neutral-800">
        <div>
          <p className="text-sm font-semibold text-white">Visibilité</p>
          <p className="text-xs text-neutral-400">Qui peut voir cette vidéo ?</p>
        </div>
        <button
          onClick={() => setIsPublic(!isPublic)}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
            isPublic ? "bg-red-500 text-white" : "bg-neutral-700 text-neutral-300"
          }`}
        >
          {isPublic ? "Public" : "Privé"}
        </button>
      </div>

      {/* Bouton Publier + Barre de progression */}
      <div className="pt-2">
        {uploading ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Mise en ligne...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-pink-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <button
            onClick={handleUpload}
            disabled={!file || !!error}
            className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 active:scale-98 transition shadow-lg shadow-red-500/20"
          >
            <Upload className="w-5 h-5" />
            Publier la vidéo
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, UploadCloud, X, Loader2, Play, CheckCircle2 } from "lucide-react";

export default function CreatePage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUserId(user.id);
    };
    checkUser();
  }, [supabase, router]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("video/")) {
      setError("Veuillez sélectionner un fichier vidéo.");
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
    setError(null);
  };

  const handleUpload = async () => {
    if (!file || !userId) return;

    setUploading(true);
    setError(null);

    try {
      // 1. Upload du fichier vidéo dans le Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("videos")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      // 2. Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from("videos")
        .getPublicUrl(fileName);

      // 3. Enregistrer dans la table videos
      const { error: dbError } = await supabase.from("videos").insert({
        user_id: userId,
        url: publicUrl,
        caption: caption,
        status: "published",
      });

      if (dbError) throw dbError;

      // 4. Rediriger vers l'accueil
      router.push("/");
      router.refresh();

    } catch (err: any) {
      setError(err.message || "Erreur lors de l'upload.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-moshi-bg flex flex-col">
      
      {/* HEADER */}
      <header className="px-4 py-4 flex items-center justify-between bg-white shadow-sm sticky top-0 z-20">
        <button onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-6 h-6 text-moshi-text" />
        </button>
        <h1 className="text-lg font-bold text-moshi-text">Nouvelle vidéo</h1>
        <div className="w-10" /> {/* Spacer */}
      </header>

      <div className="flex-1 p-6 flex flex-col max-w-md mx-auto w-full">
        
        {/* SELECTION FICHIER */}
        {!file ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-[9/16] max-h-[60vh] bg-white rounded-3xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-moshi-purple transition-colors shadow-sm"
          >
            <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center text-moshi-purple">
              <UploadCloud size={32} />
            </div>
            <div className="text-center">
              <p className="font-bold text-moshi-text">Sélectionner une vidéo</p>
              <p className="text-xs text-gray-500 mt-1">Format MP4, MOV, WebM</p>
            </div>
          </div>
        ) : (
          <div className="relative w-full aspect-[9/16] max-h-[60vh] bg-black rounded-3xl overflow-hidden shadow-lg">
            <video 
              src={previewUrl!} 
              controls 
              className="w-full h-full object-cover"
            />
            <button 
              onClick={() => { setFile(null); setPreviewUrl(null); }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <input 
          type="file" 
          accept="video/*" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          className="hidden" 
        />

        {/* DESCRIPTION */}
        <div className="mt-6">
          <label className="text-sm font-bold text-moshi-text ml-1">Description</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Décris ta vidéo... #hashtags"
            rows={3}
            className="w-full mt-2 px-4 py-3 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium resize-none"
          />
        </div>

        {error && (
          <div className="mt-4 bg-red-50 text-red-500 text-xs font-semibold p-3 rounded-xl">
            {error}
          </div>
        )}

        {/* BOUTON PUBLIER */}
        <div className="mt-auto pt-6 pb-6">
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full moshi-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-200/50 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Publication en cours...</>
            ) : (
              "Publier la vidéo"
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
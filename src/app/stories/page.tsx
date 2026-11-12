"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Image as ImageIcon } from "lucide-react";

export default function StoriesPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { 
        router.push("/auth/login"); 
        return; 
      }
      setUser(user);

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("stories")
        .select("*, profiles:user_id(username, avatar_url)")
        .gte("created_at", twentyFourHoursAgo)
        .order("created_at", { ascending: false });
      
      setStories(data || []);
    };
    load();
  }, [supabase, router]);

  const handleStoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      alert("Format non supporté. Utilisez une image ou une vidéo.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert("Fichier trop lourd (max 50MB).");
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from("stories")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      // ✅ CORRECTION : Renommé en urlData pour éviter le conflit avec 'data'
      const { data: urlData } = supabase.storage.from("stories").getPublicUrl(fileName);

      await supabase.from("stories").insert({
        user_id: user.id,
        media_url: urlData.publicUrl,
        media_type: file.type.startsWith("video/") ? "video" : "image",
      });

      alert("Story publiée !");
      
      // ✅ CORRECTION : On utilise router.refresh() pour recharger les données proprement
      router.refresh();
    } catch (err: any) {
      console.error(err);
      alert("Erreur: " + err.message);
    }

    setUploading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-neutral-800 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Stories</h1>
      </header>

      <div className="p-4">
        <div className="mb-6">
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleStoryUpload}
            className="hidden"
            ref={fileInputRef}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full bg-neutral-900 hover:bg-neutral-800 rounded-xl p-4 flex items-center gap-3 disabled:opacity-50 transition"
          >
            <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
              {uploading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-6 h-6 text-white" />
              )}
            </div>
            <div className="text-left">
              <p className="font-semibold">Créer une story</p>
              <p className="text-xs text-neutral-400">Photo ou vidéo (24h)</p>
            </div>
          </button>
        </div>

        {stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
            <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-sm">Aucune story pour le moment</p>
            <p className="text-xs text-neutral-600 mt-2">Soyez le premier à en publier une !</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {stories.map((story) => (
              <div key={story.id} className="relative aspect-[3/4] bg-neutral-900 rounded-lg overflow-hidden group">
                {story.media_type === "video" ? (
                  <video src={story.media_url} className="w-full h-full object-cover" muted loop />
                ) : (
                  <img src={story.media_url} alt="Story" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-2 left-2 flex items-center gap-1">
                  <div className="w-6 h-6 rounded-full bg-neutral-800 overflow-hidden border border-white/20">
                    {story.profiles?.avatar_url ? (
                      <img src={story.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                        {story.profiles?.username?.charAt(0).toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-white font-semibold">
                    {story.profiles?.username || "Anonyme"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

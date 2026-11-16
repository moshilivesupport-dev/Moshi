"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Plus, ArrowRight, Camera, Video, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface Story {
  id: string;
  user_id: string;
  image_url: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export default function StoriesBar() {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stories, setStories] = useState<Story[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const loadStories = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data } = await supabase
        .from("stories")
        .select("id, user_id, image_url")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (data) {
        const userIds = [...new Set(data.map(s => s.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds);

        const profilesMap: Record<string, any> = {};
        (profilesData || []).forEach(p => { profilesMap[p.id] = p; });

        setStories(data.map(s => ({ ...s, profiles: profilesMap[s.user_id] || null })));
      }
    };
    loadStories();
  }, [supabase]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setUploading(true);
    setIsMenuOpen(false);

    try {
      const isVideo = file.type.startsWith("video/");
      const fileExt = file.name.split(".").pop();
      const filePath = `${currentUser.id}/story-${Date.now()}.${fileExt}`;

      // 1. Upload dans le bucket "stories"
      const { error: uploadError } = await supabase.storage
        .from("stories")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from("stories")
        .getPublicUrl(filePath);

      // 3. Enregistrer dans la table stories
      const { error: dbError } = await supabase.from("stories").insert({
        user_id: currentUser.id,
        image_url: publicUrl, // (on utilise image_url même pour les vidéos)
      });

      if (dbError) throw dbError;

      alert("Story publiée !");
      window.location.reload();

    } catch (err: any) {
      alert("Erreur : " + err.message + "\n(Vérifie que le bucket 'stories' existe sur Supabase et qu'il est Public).");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="flex items-start gap-4 overflow-x-auto scrollbar-hide py-2 pointer-events-auto">
        
        {/* Bouton Ajouter (Votre story) */}
        {currentUser && (
          <button onClick={() => setIsMenuOpen(true)} className="flex flex-col items-center gap-1 shrink-0 relative">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/50 p-1">
              <div className="w-full h-full rounded-full bg-gray-800 overflow-hidden relative">
                <Image 
                  src={currentUser.user_metadata?.avatar_url || "https://i.pravatar.cc/150?img=0"} 
                  alt="Moi" 
                  width={64} 
                  height={64} 
                  className="w-full h-full object-cover" 
                  unoptimized 
                />
                <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full moshi-gradient flex items-center justify-center border-2 border-black">
                  <Plus size={12} className="text-white" strokeWidth={3} />
                </div>
              </div>
            </div>
            <span className="text-white text-[10px] font-semibold max-w-[64px] truncate">Votre story</span>
          </button>
        )}

        {/* Liste des stories */}
        {stories.map((story) => {
          const name = story.profiles?.username || "user";
          return (
            <button key={story.id} onClick={() => router.push(`/stories/${story.user_id}`)} className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-moshi-pink via-moshi-purple to-moshi-blue">
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-black relative">
                  <Image src={story.image_url} alt={name} width={64} height={64} className="w-full h-full object-cover" unoptimized />
                </div>
              </div>
              <span className="text-white text-[10px] font-semibold max-w-[64px] truncate">{name}</span>
            </button>
          );
        })}

        {/* Bouton Voir plus */}
        {stories.length > 0 && (
          <button className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <ArrowRight size={24} className="text-white" />
            </div>
            <span className="text-white text-[10px] font-semibold">Voir plus</span>
          </button>
        )}
      </div>

      {/* MODALE DE CRÉATION DE STORY (Uniquement Vidéo ou Photo) */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-[32px] p-6 pb-safe"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-extrabold text-moshi-text">Nouvelle Story</h2>
                <button onClick={() => setIsMenuOpen(false)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-purple-50 border border-purple-100 active:scale-95 transition">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500 flex items-center justify-center text-white shadow-lg">
                    <Camera size={26} />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-moshi-text text-sm">Photo</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Prendre ou choisir</p>
                  </div>
                </button>

                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-pink-50 border border-pink-100 active:scale-95 transition">
                  <div className="w-14 h-14 rounded-2xl moshi-gradient flex items-center justify-center text-white shadow-lg">
                    <Video size={26} />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-moshi-text text-sm">Vidéo</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Filmer ou choisir</p>
                  </div>
                </button>
              </div>

              {uploading && (
                <div className="mt-4 text-center text-sm text-moshi-purple font-bold">
                  Publication en cours...
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Input Caché pour Photo/Vidéo */}
      <input 
        type="file" 
        accept="image/*,video/*" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        className="hidden" 
      />
    </>
  );
}
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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
  const [stories, setStories] = useState<Story[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const loadStories = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Charger les stories actives (< 24h)
      const { data } = await supabase
        .from("stories")
        .select("id, user_id, image_url")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (data) {
        // Récupérer les profils des auteurs
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

  return (
    <div className="absolute top-[110px] left-0 right-0 z-30 px-4">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide py-2">
        
        {/* Bouton Ajouter (si connecté) */}
        {currentUser && (
          <button onClick={() => router.push("/create?mode=story")} className="flex flex-col items-center gap-1 shrink-0">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/50 flex items-center justify-center bg-black/30 backdrop-blur-md">
              <Plus size={24} className="text-white" />
            </div>
            <span className="text-white text-[10px] font-semibold max-w-[64px] truncate">Ajouter</span>
          </button>
        )}

        {/* Liste des stories */}
        {stories.map((story) => {
          const name = story.profiles?.username || "user";
          return (
            <button key={story.id} className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-moshi-pink via-moshi-purple to-moshi-blue">
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-black">
                  <Image src={story.image_url} alt={name} width={64} height={64} className="w-full h-full object-cover" unoptimized />
                </div>
              </div>
              <span className="text-white text-[10px] font-semibold max-w-[64px] truncate">{name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
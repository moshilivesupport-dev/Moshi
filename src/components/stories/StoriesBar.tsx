"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Plus, Heart, Bell } from "lucide-react";

interface Story {
  id: string;
  media_url: string;
  user_id: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export default function StoriesBar({ currentUserId }: { currentUserId: string }) {
  const supabase = createClient();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStories = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("stories")
        .select(`
          id, media_url, user_id,
          profiles:user_id (username, avatar_url)
        `)
        .gte("expires_at", now)
        .order("created_at", { ascending: false });

      if (data) {
        const uniqueUsers = new Map();
        data.forEach((story: any) => {
          if (!uniqueUsers.has(story.user_id)) {
            uniqueUsers.set(story.user_id, {
              ...story,
              profiles: Array.isArray(story.profiles) ? story.profiles[0] : story.profiles
            });
          }
        });
        setStories(Array.from(uniqueUsers.values()));
      }
      setLoading(false);
    };

    loadStories();
  }, [supabase]);

  return (
    <div className="w-full overflow-x-auto scrollbar-hide border-b border-neutral-800 pb-3">
      <div className="flex gap-4 px-4 pt-3">
        
        {/* ✅ 1. BOUTON ACTIVITÉ (Notifications) */}
        <Link href="/notifications" className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="relative w-16 h-16 rounded-full bg-neutral-900 border-2 border-neutral-700 flex items-center justify-center">
            <Bell className="w-7 h-7 text-white" />
            {/* Petit badge rouge pour dire qu'il y a des notifications */}
            <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-black" />
          </div>
          <span className="text-[10px] text-white font-semibold">Activité</span>
        </Link>

        {/* ✅ 2. BOUTON CRÉER UNE STORY */}
        <Link href="/stories/new" className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="relative w-16 h-16">
            <div className="w-full h-full rounded-full border-2 border-dashed border-neutral-600 bg-neutral-900 flex items-center justify-center overflow-hidden">
              <Plus className="w-6 h-6 text-neutral-400" />
            </div>
          </div>
          <span className="text-[10px] text-white font-semibold">Créer</span>
        </Link>

        {/* ✅ 3. LISTE DES STORIES */}
        {stories.map((story) => (
          <Link
            key={story.id}
            href={`/stories?user=${story.user_id}`}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
              <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-neutral-800">
                {story.profiles?.avatar_url ? (
                  <img
                    src={story.profiles.avatar_url}
                    alt={story.profiles.username || ""}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white">
                    {(story.profiles?.username?.[0] || "U").toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <span className="text-[10px] text-white font-medium truncate max-w-[64px]">
              {story.profiles?.username || "user"}
            </span>
          </Link>
        ))}

        {!loading && stories.length === 0 && (
          <div className="flex items-center text-neutral-500 text-xs italic px-2">
            Aucune story active
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus } from "lucide-react";
import StoryViewer from "./StoryViewer";

interface Story {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  media_url: string;
  created_at: string;
}

interface UserStory {
  user_id: string;
  username: string;
  avatar_url: string | null;
  stories: Story[];
  viewed: boolean;
}

export default function StoryBar() {
  const supabase = createClient();
  const [userStories, setUserStories] = useState<UserStory[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedUserIndex, setSelectedUserIndex] = useState(0);

  useEffect(() => {
    const loadStories = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Récupérer les stories des 24 dernières heures
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data } = await supabase
        .from("stories")
        .select(`
          id,
          user_id,
          media_url,
          created_at,
          profiles:user_id (id, username, avatar_url)
        `)
        .gte("created_at", twentyFourHoursAgo)
        .order("created_at", { ascending: false });

      // Grouper par utilisateur
      const grouped: Record<string, UserStory> = {};
      (data || []).forEach((story: any) => {
        const userId = story.user_id;
        if (!grouped[userId]) {
          grouped[userId] = {
            user_id: userId,
            username: story.profiles?.username || "User",
            avatar_url: story.profiles?.avatar_url,
            stories: [],
            viewed: false, // TODO: Charger l'état de visionnage
          };
        }
        grouped[userId].stories.push({
          id: story.id,
          user_id: userId,
          username: story.profiles?.username || "User",
          avatar_url: story.profiles?.avatar_url,
          media_url: story.media_url,
          created_at: story.created_at,
        });
      });

      setUserStories(Object.values(grouped));
    };

    loadStories();
  }, [supabase]);

  const openViewer = (index: number) => {
    setSelectedUserIndex(index);
    setViewerOpen(true);
  };

  return (
    <>
      <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide border-b border-neutral-800/50 bg-black">
        {/* Bouton "Ma story" */}
        {currentUser && (
          <button className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="relative w-16 h-16 rounded-full bg-neutral-800 border-2 border-dashed border-neutral-600 flex items-center justify-center">
              <Plus className="w-6 h-6 text-neutral-400" />
            </div>
            <span className="text-[10px] text-neutral-400">Vous</span>
          </button>
        )}

        {/* Stories des autres utilisateurs */}
        {userStories.map((userStory, index) => (
          <button
            key={userStory.user_id}
            onClick={() => openViewer(index)}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div
              className={`w-16 h-16 rounded-full p-[2px] ${
                userStory.viewed
                  ? "bg-neutral-700"
                  : "bg-gradient-to-tr from-red-500 via-pink-500 to-yellow-400"
              }`}
            >
              <div className="w-full h-full rounded-full bg-black p-[2px]">
                <div className="w-full h-full rounded-full bg-neutral-800 overflow-hidden">
                  {userStory.avatar_url ? (
                    <img
                      src={userStory.avatar_url}
                      alt={userStory.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold">
                      {userStory.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <span className="text-[10px] text-white max-w-[64px] truncate">
              {userStory.username}
            </span>
          </button>
        ))}
      </div>

      {/* Viewer plein écran */}
      {viewerOpen && (
        <StoryViewer
          userStories={userStories}
          initialIndex={selectedUserIndex}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
}

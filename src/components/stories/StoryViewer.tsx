"use client";

import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface StoryViewerProps {
  storyIds: string[];
  initialIndex?: number;
  onClose: () => void;
}

export default function StoryViewer({ storyIds, initialIndex = 0, onClose }: StoryViewerProps) {
  const supabase = createClient();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [story, setStory] = useState<any>(null);
  const [viewCount, setViewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const currentStoryId = storyIds[currentIndex];

  // Charger la story
  useEffect(() => {
    const load = async () => {
      if (!currentStoryId) return;
      setLoading(true);

      const { data: storyData } = await supabase
        .from("stories")
        .select(`
          id, media_url, caption, user_id, created_at,
          profiles:user_id (username, avatar_url)
        `)
        .eq("id", currentStoryId)
        .maybeSingle();

      if (storyData) {
        setStory({
          ...storyData,
          profiles: Array.isArray(storyData.profiles) ? storyData.profiles[0] : storyData.profiles
        });

        // Compter les vues
        const { count } = await supabase
          .from("story_views")
          .select("*", { count: "exact", head: true })
          .eq("story_id", currentStoryId);
        
        setViewCount(count || 0);

        // Enregistrer la vue
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("story_views").insert({
            story_id: currentStoryId,
            viewer_id: user.id,
          }).select().maybeSingle();
        }
      }
      setLoading(false);
    };
    load();
  }, [currentStoryId, supabase]);

  // Navigation
  const nextStory = () => {
    if (currentIndex < storyIds.length - 1) setCurrentIndex(currentIndex + 1);
    else onClose();
  };

  const prevStory = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  // Barre de progression
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          nextStory();
          return 0;
        }
        return p + 1;
      });
    }, 50); // 5 secondes
    return () => clearInterval(interval);
  }, [currentIndex]);

  if (loading || !story) return <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center text-white">Chargement...</div>;

  return (
    <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center">
      {/* Barre de progression en haut */}
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-20">
        {storyIds.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all" 
              style={{ width: i === currentIndex ? `${progress}%` : i < currentIndex ? "100%" : "0%" }} 
            />
          </div>
        ))}
      </div>

      {/* Header avec l'auteur */}
      <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-800">
            {story.profiles?.avatar_url ? (
              <img src={story.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                {(story.profiles?.username?.[0] || "U").toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-white text-sm font-semibold">{story.profiles?.username || "user"}</p>
            <p className="text-white/60 text-[10px]">
              {new Date(story.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2">
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Image de la story */}
      <img src={story.media_url} alt="" className="w-full h-full object-contain" />

      {/* Navigation */}
      <button onClick={prevStory} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 z-20">
        <ChevronLeft className="w-8 h-8 text-white" />
      </button>
      <button onClick={nextStory} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 z-20">
        <ChevronRight className="w-8 h-8 text-white" />
      </button>

      {/* Compteur de vues en bas */}
      <div className="absolute bottom-6 left-4 right-4 z-20 flex items-center gap-2 bg-black/50 backdrop-blur-md rounded-full px-4 py-2 w-fit">
        <Eye className="w-4 h-4 text-white" />
        <span className="text-white text-sm font-semibold">{viewCount} vue{viewCount > 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
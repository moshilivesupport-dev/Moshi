"use client";

import { useEffect, useState, useRef } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
}

interface StoryViewerProps {
  userStories: UserStory[];
  initialIndex: number;
  onClose: () => void;
}

export default function StoryViewer({ userStories, initialIndex, onClose }: StoryViewerProps) {
  const [userIndex, setUserIndex] = useState(initialIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentUserStory = userStories[userIndex];
  const currentStory = currentUserStory?.stories[storyIndex];

  // Progression automatique (5 secondes par story)
  useEffect(() => {
    if (paused || !currentStory) return;

    setProgress(0);
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextStory();
          return 0;
        }
        return prev + 2; // 2% toutes les 100ms = 5s total
      });
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [storyIndex, userIndex, paused, currentStory]);

  const nextStory = () => {
    if (storyIndex < currentUserStory.stories.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else if (userIndex < userStories.length - 1) {
      setUserIndex(userIndex + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  };

  const prevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    } else if (userIndex > 0) {
      setUserIndex(userIndex - 1);
      setStoryIndex(userStories[userIndex - 1].stories.length - 1);
    }
  };

  const handleTap = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width / 3) {
      prevStory();
    } else if (x > (width * 2) / 3) {
      nextStory();
    }
  };

  if (!currentStory) return null;

  const isVideo = currentStory.media_url.endsWith(".mp4") || currentStory.media_url.endsWith(".mov");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-[100] bg-black"
      onClick={handleTap}
      onMouseDown={() => setPaused(true)}
      onMouseUp={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      {/* Media */}
      <div className="absolute inset-0 flex items-center justify-center">
        {isVideo ? (
          <video
            key={currentStory.id}
            src={currentStory.media_url}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
        ) : (
          <img
            src={currentStory.media_url}
            alt="Story"
            className="w-full h-full object-contain"
          />
        )}
      </div>

      {/* Overlay dégradé */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 pointer-events-none" />

      {/* Barres de progression */}
      <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
        {currentUserStory.stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width: idx < storyIndex ? "100%" : idx === storyIndex ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 left-4 right-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-neutral-800 overflow-hidden border border-white/20">
            {currentUserStory.avatar_url ? (
              <img src={currentUserStory.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-sm">
                {currentUserStory.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{currentUserStory.username}</p>
            <p className="text-[10px] text-neutral-300">
              {getTimeAgo(currentStory.created_at)}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Boutons navigation (optionnels, visibles au hover) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          prevStory();
        }}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center opacity-0 hover:opacity-100 transition z-20"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          nextStory();
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center opacity-0 hover:opacity-100 transition z-20"
      >
        <ChevronRight className="w-5 h-5 text-white" />
      </button>

      {/* Input réponse (optionnel) */}
      <div className="absolute bottom-6 left-4 right-4 z-20">
        <input
          type="text"
          placeholder="Envoyer un message..."
          onClick={(e) => e.stopPropagation()}
          className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2.5 text-sm text-white placeholder-neutral-300 focus:outline-none focus:border-white/40 transition"
        />
      </div>
    </motion.div>
  );
}

function getTimeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "à l'instant";
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)} h`;
  return `il y a ${Math.floor(seconds / 86400)} j`;
}

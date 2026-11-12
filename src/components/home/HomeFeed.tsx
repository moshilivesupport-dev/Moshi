"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Heart, MessageCircle, Share2, Play, UserPlus, Music } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

export type FeedItem = {
  id: string;
  type?: "video" | "post";
  title?: string | null;
  description?: string | null;
  media_url?: string | null;
  thumbnail_url?: string | null;
  duration?: number | null;
  views_count?: number | null;
  likes_count?: number | null;
  comments_count?: number | null;
  created_at?: string;
  user_id: string;
  profiles?: {
    id: string;
    username: string | null;
    avatar_url: string | null;
    full_name: string | null;
  } | null;
};

interface HomeFeedProps {
  initialItems?: FeedItem[];
}

export default function HomeFeed({ initialItems }: HomeFeedProps) {
  const supabase = createClient();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [videos, setVideos] = useState<FeedItem[]>(initialItems || []);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(initialItems ? false : true);
  const [doubleTapLike, setDoubleTapLike] = useState<{ id: string; x: number; y: number } | null>(null);

  // Charger les vidéos
  const loadVideos = useCallback(async () => {
    if (initialItems && initialItems.length > 0) return;

    setLoading(true);
    const { data } = await supabase
      .from("videos")
      .select(
        `
        id, url, caption, like_count, comment_count, view_count, user_id,
        profiles:user_id ( id, username, avatar_url, full_name )
      `
      )
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(30);

    const rows = (data || []).map((v: any) => ({
      ...v,
      media_url: v.url,
      views_count: v.view_count,
      likes_count: v.like_count,
      comments_count: v.comment_count,
      profiles: Array.isArray(v.profiles) ? v.profiles[0] : v.profiles,
    }));
    setVideos(rows);
    setLoading(false);
  }, [supabase, initialItems]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // Intersection Observer pour détecter la vidéo active
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-index"));
            if (!Number.isNaN(idx)) setActive(idx);
          }
        });
      },
      { root, threshold: 0.65 }
    );

    root.querySelectorAll("[data-index]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [videos]);

  // Double-tap pour liker
  const handleDoubleTap = useCallback(
    (videoId: string, e: React.MouseEvent | React.TouchEvent) => {
      let x = 0, y = 0;
      if ("touches" in e) {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
      } else {
        x = e.clientX;
        y = e.clientY;
      }

      setDoubleTapLike({ id: videoId, x, y });
      setTimeout(() => setDoubleTapLike(null), 1000);

      if (!liked[videoId]) {
        toggleLike(videoId);
      }
    },
    [liked]
  );

  const toggleLike = useCallback(async (videoId: string) => {
    setLiked((prev) => ({ ...prev, [videoId]: !prev[videoId] }));
    setVideos((prev) =>
      prev.map((v) =>
        v.id === videoId
          ? { ...v, likes_count: (v.likes_count || 0) + (liked[videoId] ? -1 : 1) }
          : v
      )
    );
  }, [liked]);

  if (loading) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center text-neutral-500">
        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!videos.length) {
    return (
      <div className="h-[100dvh] bg-black flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Play className="w-10 h-10 text-neutral-600" />
        <p className="text-neutral-400">Aucune vidéo pour le moment</p>
        <Link href="/videos/new" className="text-red-500 font-semibold text-sm">
          Publier la première
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory bg-black scrollbar-hide"
    >
      {videos.map((video, index) => {
        const isActive = index === active;
        const author = video.profiles;
        const name = author?.username || author?.full_name || "user";

        return (
          <section
            key={video.id}
            data-index={index}
            className="relative h-[100dvh] w-full snap-start snap-always flex items-center justify-center bg-black"
            onDoubleClick={(e) => handleDoubleTap(video.id, e)}
          >
            {/* Vidéo plein écran */}
            {video.media_url && (
              <video
                src={video.media_url}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                loop
                muted={muted}
                autoPlay={isActive}
                ref={(el) => {
                  if (!el) return;
                  if (isActive) {
                    el.play().catch(() => {});
                  } else {
                    el.pause();
                    el.currentTime = 0;
                  }
                }}
              />
            )}

            {/* Dégradé pour lisibilité */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

            {/* Animation cœur double-tap */}
            {doubleTapLike?.id === video.id && (
              <div
                className="absolute z-50 pointer-events-none animate-ping"
                style={{
                  left: doubleTapLike.x - 40,
                  top: doubleTapLike.y - 40,
                }}
              >
                <Heart className="w-20 h-20 text-red-500 fill-red-500" />
              </div>
            )}

            {/* Actions à DROITE (style TikTok) */}
            <div className="absolute right-3 bottom-32 z-20 flex flex-col items-center gap-5">
              {/* Avatar + bouton follow */}
              <div className="relative">
                <Link
                  href={`/profile/${video.user_id}`}
                  className="relative w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-neutral-800"
                >
                  {author?.avatar_url ? (
                    <img
                      src={author.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Link>
                <button className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center border-2 border-black">
                  <UserPlus className="w-3 h-3 text-white" />
                </button>
              </div>

              {/* Like */}
              <button
                type="button"
                onClick={() => toggleLike(video.id)}
                className="flex flex-col items-center gap-1 active:scale-90 transition"
              >
                <Heart
                  className={cn(
                    "w-9 h-9 transition-all",
                    liked[video.id]
                      ? "fill-red-500 text-red-500 scale-110"
                      : "text-white"
                  )}
                />
                <span className="text-xs text-white font-semibold">
                  {formatNumber(video.likes_count || 0)}
                </span>
              </button>

              {/* Commentaires */}
              <Link
                href={`/videos/${video.id}`}
                className="flex flex-col items-center gap-1"
              >
                <MessageCircle className="w-9 h-9 text-white" />
                <span className="text-xs text-white font-semibold">
                  {formatNumber(video.comments_count || 0)}
                </span>
              </Link>

              {/* Partager */}
              <button type="button" className="flex flex-col items-center gap-1">
                <Share2 className="w-8 h-8 text-white" />
                <span className="text-xs text-white font-semibold">Partager</span>
              </button>

              {/* Disque musical qui tourne */}
              <div className="w-10 h-10 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center animate-spin-slow mt-2">
                <Music className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Infos en BAS À GAUCHE (style TikTok) */}
            <div className="absolute left-4 right-20 bottom-20 z-20">
              <Link
                href={`/profile/${video.user_id}`}
                className="font-bold text-white text-base hover:underline"
              >
                @{name}
              </Link>
              {(video.description || video.title) && (
                <p className="mt-2 text-sm text-white/90 line-clamp-2">
                  {video.description || video.title}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Music className="w-3 h-3 text-white" />
                <span className="text-xs text-white/80">Son original - {name}</span>
              </div>
            </div>
          </section>
        );
      })}

      {/* Style pour l'animation du disque */}
      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 5s linear infinite;
        }
      `}</style>
    </div>
  );
}

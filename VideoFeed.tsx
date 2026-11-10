"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatNumber } from "@/lib/utils";
import {
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type VideoItem = {
  id: string;
  title: string | null;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration: number;
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_id: string;
  profiles?: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

interface VideoFeedProps {
  initialVideos?: VideoItem[];
  className?: string;
}

function VideoCard({
  video,
  isActive,
  onLike,
  liked,
}: {
  video: VideoItem;
  isActive: boolean;
  onLike: (id: string) => void;
  liked: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (isActive) {
      el.play().catch(() => {});
      setPlaying(true);
    } else {
      el.pause();
      el.currentTime = 0;
      setPlaying(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const authorName =
    video.profiles?.full_name ||
    video.profiles?.username ||
    "Utilisateur";

  return (
    <div className="relative h-[100dvh] w-full snap-start snap-always bg-black flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        src={video.video_url}
        poster={video.thumbnail_url || undefined}
        loop
        playsInline
        muted={muted}
        className="absolute inset-0 w-full h-full object-cover"
        onClick={togglePlay}
      />

      {/* Gradient bas */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

      {/* Overlay droit (actions) */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
        {/* Avatar */}
        <Link
          href={`/profil/${video.user_id}`}
          className="relative"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-neutral-800">
            {video.profiles?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={video.profiles.avatar_url}
                alt={authorName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-lg font-semibold">
                {authorName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </Link>

        {/* Like */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike(video.id);
          }}
          className="flex flex-col items-center gap-1"
        >
          <div
            className={cn(
              "w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center transition",
              liked && "text-red-500"
            )}
          >
            <Heart
              className={cn("w-6 h-6", liked && "fill-current")}
            />
          </div>
          <span className="text-xs text-white font-medium">
            {formatNumber(video.likes_count + (liked ? 1 : 0))}
          </span>
        </button>

        {/* Commentaires */}
        <Link
          href={`/videos/${video.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs text-white font-medium">
            {formatNumber(video.comments_count)}
          </span>
        </Link>

        {/* Partage */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (navigator.share) {
              navigator.share({
                title: video.title || "Vidéo Moshi",
                url: `${window.location.origin}/videos/${video.id}`,
              });
            }
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs text-white font-medium">Partager</span>
        </button>
      </div>

      {/* Overlay bas (infos) */}
      <div className="absolute left-0 right-16 bottom-20 px-4 z-10">
        <Link
          href={`/profil/${video.user_id}`}
          className="font-semibold text-white text-[15px] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          @{video.profiles?.username || authorName}
        </Link>

        {video.title && (
          <p className="text-white text-sm mt-1 font-medium line-clamp-1">
            {video.title}
          </p>
        )}

        {video.description && (
          <p className="text-white/90 text-sm mt-1 line-clamp-2">
            {video.description}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2 text-xs text-white/70">
          <span>{formatNumber(video.views_count)} vues</span>
          <span>·</span>
          <span>{video.duration}s</span>
        </div>
      </div>

      {/* Contrôles son / play */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMuted((m) => !m);
          }}
          className="w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center"
        >
          {muted ? (
            <VolumeX className="w-4 h-4 text-white" />
          ) : (
            <Volume2 className="w-4 h-4 text-white" />
          )}
        </button>
      </div>

      {/* Indicateur play/pause central (discret) */}
      {!playing && isActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function VideoFeed({
  initialVideos = [],
  className,
}: VideoFeedProps) {
  const supabase = createClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const [videos, setVideos] = useState<VideoItem[]>(initialVideos);
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(initialVideos.length === 0);

  // Charger les vidéos si pas d'initial
  useEffect(() => {
    if (initialVideos.length > 0) return;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("videos")
        .select(
          `
          id,
          title,
          description,
          video_url,
          thumbnail_url,
          duration,
          views_count,
          likes_count,
          comments_count,
          created_at,
          user_id,
          profiles:user_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `
        )
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!error && data) {
        setVideos(data as unknown as VideoItem[]);
      }
      setLoading(false);
    }

    load();
  }, [initialVideos.length, supabase]);

  // Observer pour détecter la vidéo active (snap)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || videos.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-index"));
            if (!Number.isNaN(index)) {
              setActiveIndex(index);

              // Incrémenter les vues (fire & forget)
              const videoId = videos[index]?.id;
              if (videoId) {
                supabase.rpc("increment_video_views", {
                  video_uuid: videoId,
                });
              }
            }
          }
        });
      },
      {
        root: container,
        threshold: 0.6,
      }
    );

    const children = container.querySelectorAll("[data-index]");
    children.forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, [videos, supabase]);

  const handleLike = useCallback(
    async (videoId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const alreadyLiked = likedIds.has(videoId);

      if (alreadyLiked) {
        await supabase
          .from("video_likes")
          .delete()
          .eq("video_id", videoId)
          .eq("user_id", user.id);
        setLikedIds((prev) => {
          const next = new Set(prev);
          next.delete(videoId);
          return next;
        });
      } else {
        await supabase.from("video_likes").insert({
          video_id: videoId,
          user_id: user.id,
        });
        setLikedIds((prev) => new Set(prev).add(videoId));
      }
    },
    [likedIds, supabase]
  );

  if (loading) {
    return (
      <div className="h-[100dvh] w-full bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="h-[100dvh] w-full bg-black flex flex-col items-center justify-center gap-4 text-white">
        <p className="text-neutral-400">Aucune vidéo pour le moment</p>
        <Link
          href="/videos/new"
          className="px-5 py-2.5 rounded-full bg-red-500 text-sm font-medium"
        >
          Publier la première
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide",
        className
      )}
    >
      {videos.map((video, index) => (
        <div key={video.id} data-index={index}>
          <VideoCard
            video={video}
            isActive={index === activeIndex}
            onLike={handleLike}
            liked={likedIds.has(video.id)}
          />
        </div>
      ))}
    </div>
  );
}

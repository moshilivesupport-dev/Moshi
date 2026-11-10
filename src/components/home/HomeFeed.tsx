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
  Radio,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type FeedItem = {
  id: string;
  type: "video" | "live";
  title: string | null;
  description: string | null;
  media_url: string;          // video_url ou stream_url
  thumbnail_url: string | null;
  duration?: number;
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_id: string;
  is_live?: boolean;
  profiles?: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

interface HomeFeedProps {
  initialItems?: FeedItem[];
}

function FeedCard({
  item,
  isActive,
  onLike,
  liked,
}: {
  item: FeedItem;
  isActive: boolean;
  onLike: (id: string) => void;
  liked: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || item.type === "live") return;

    if (isActive) {
      el.play().catch(() => {});
      setPlaying(true);
    } else {
      el.pause();
      el.currentTime = 0;
      setPlaying(false);
    }
  }, [isActive, item.type]);

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
    item.profiles?.full_name ||
    item.profiles?.username ||
    "Utilisateur";

  const profileHref = `/profil/${item.user_id}`;

  return (
    <div className="relative h-[100dvh] w-full snap-start snap-always bg-black flex items-center justify-center overflow-hidden">
      {/* Média */}
      {item.type === "video" ? (
        <video
          ref={videoRef}
          src={item.media_url}
          poster={item.thumbnail_url || undefined}
          loop
          playsInline
          muted={muted}
          className="absolute inset-0 w-full h-full object-cover"
          onClick={togglePlay}
        />
      ) : (
        // Placeholder live (à remplacer par ton player live réel)
        <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
          {item.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnail_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
          ) : null}
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <Radio className="w-8 h-8 text-red-500" />
            </div>
            <span className="text-white font-semibold">Live en cours</span>
          </div>
        </div>
      )}

      {/* Gradient */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

      {/* Badge Live */}
      {item.type === "live" && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-red-500 px-2.5 py-1 rounded-md text-xs font-bold text-white">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </div>
      )}

      {/* Actions droites */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
        <Link href={profileHref} onClick={(e) => e.stopPropagation()}>
          <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-neutral-800">
            {item.profiles?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.profiles.avatar_url}
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

        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike(item.id);
          }}
          className="flex flex-col items-center gap-1"
        >
          <div
            className={cn(
              "w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center",
              liked && "text-red-500"
            )}
          >
            <Heart className={cn("w-6 h-6", liked && "fill-current")} />
          </div>
          <span className="text-xs text-white font-medium">
            {formatNumber(item.likes_count + (liked ? 1 : 0))}
          </span>
        </button>

        <Link
          href={item.type === "video" ? `/videos/${item.id}` : `/live/${item.id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs text-white font-medium">
            {formatNumber(item.comments_count)}
          </span>
        </Link>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (navigator.share) {
              navigator.share({
                title: item.title || "Moshi",
                url: window.location.origin + (item.type === "video" ? `/videos/${item.id}` : `/live/${item.id}`),
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

      {/* Infos bas */}
      <div className="absolute left-0 right-16 bottom-20 px-4 z-10">
        <Link
          href={profileHref}
          className="font-semibold text-white text-[15px] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          @{item.profiles?.username || authorName}
        </Link>

        {item.title && (
          <p className="text-white text-sm mt-1 font-medium line-clamp-1">
            {item.title}
          </p>
        )}
        {item.description && (
          <p className="text-white/90 text-sm mt-1 line-clamp-2">
            {item.description}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2 text-xs text-white/70">
          <span>{formatNumber(item.views_count)} vues</span>
          {item.duration && (
            <>
              <span>·</span>
              <span>{item.duration}s</span>
            </>
          )}
        </div>
      </div>

      {/* Mute */}
      {item.type === "video" && (
        <div className="absolute top-4 right-4 z-10">
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
      )}

      {!playing && isActive && item.type === "video" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomeFeed({ initialItems = [] }: HomeFeedProps) {
  const supabase = createClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<FeedItem[]>(initialItems);
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(initialItems.length === 0);

  useEffect(() => {
    if (initialItems.length > 0) return;

    async function load() {
      setLoading(true);

      // On charge d'abord les vidéos (le plus simple et déjà en place)
      const { data: videos } = await supabase
        .from("videos")
        .select(
          `
          id, title, description, video_url, thumbnail_url,
          duration, views_count, likes_count, comments_count,
          created_at, user_id,
          profiles:user_id (id, username, full_name, avatar_url)
        `
        )
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(40);

      const feed: FeedItem[] = (videos || []).map((v: any) => ({
        id: v.id,
        type: "video" as const,
        title: v.title,
        description: v.description,
        media_url: v.video_url,
        thumbnail_url: v.thumbnail_url,
        duration: v.duration,
        views_count: v.views_count,
        likes_count: v.likes_count,
        comments_count: v.comments_count,
        created_at: v.created_at,
        user_id: v.user_id,
        profiles: v.profiles,
      }));

      setItems(feed);
      setLoading(false);
    }

    load();
  }, [initialItems.length, supabase]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-index"));
            if (!Number.isNaN(index)) setActiveIndex(index);
          }
        });
      },
      { root: container, threshold: 0.6 }
    );

    container.querySelectorAll("[data-index]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  const handleLike = useCallback(
    async (id: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const already = likedIds.has(id);
      if (already) {
        await supabase
          .from("video_likes")
          .delete()
          .eq("video_id", id)
          .eq("user_id", user.id);
        setLikedIds((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
      } else {
        await supabase.from("video_likes").insert({
          video_id: id,
          user_id: user.id,
        });
        setLikedIds((prev) => new Set(prev).add(id));
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

  if (items.length === 0) {
    return (
      <div className="h-[100dvh] w-full bg-black flex flex-col items-center justify-center gap-4 text-white px-6">
        <p className="text-neutral-400 text-center">
          Aucun contenu pour le moment.
          <br />
          Publiez la première vidéo !
        </p>
        <Link
          href="/videos/new"
          className="px-6 py-2.5 rounded-full bg-red-500 text-sm font-medium"
        >
          Publier une vidéo
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
    >
      {items.map((item, index) => (
        <div key={`${item.type}-${item.id}`} data-index={index}>
          <FeedCard
            item={item}
            isActive={index === activeIndex}
            onLike={handleLike}
            liked={likedIds.has(item.id)}
          />
        </div>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Play,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

type VideoRow = {
  id: string;
  url: string;
  caption: string | null;
  like_count: number | null;
  comment_count: number | null;
  view_count: number | null;
  user_id: string;
  profiles?: {
    id: string;
    username: string | null;
    avatar_url: string | null;
    full_name: string | null;
  } | null;
};

export default function HomeFeed() {
  const supabase = createClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
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
        profiles: Array.isArray(v.profiles) ? v.profiles[0] : v.profiles,
      }));
      setVideos(rows);
      setLoading(false);
    })();
  }, [supabase]);

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

  const toggleLike = useCallback(
    async (videoId: string) => {
      setLiked((prev) => ({ ...prev, [videoId]: !prev[videoId] }));
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoId
            ? {
                ...v,
                like_count: (v.like_count || 0) + (liked[videoId] ? -1 : 1),
              }
            : v
        )
      );
    },
    [liked]
  );

  if (loading) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center text-neutral-500">
        Chargement...
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
      className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory bg-black scrollbar-hide"
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
          >
            <video
              src={video.url}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              loop
              muted={muted}
              autoPlay={isActive}
              poster={undefined}
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

            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

            {/* Actions droite */}
            <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-5">
              <Link
                href={`/profile/${video.user_id}`}
                className="relative w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-neutral-800"
              >
                {author?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
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

              <button
                type="button"
                onClick={() => toggleLike(video.id)}
                className="flex flex-col items-center gap-1"
              >
                <Heart
                  className={cn(
                    "w-8 h-8",
                    liked[video.id] ? "fill-red-500 text-red-500" : "text-white"
                  )}
                />
                <span className="text-xs text-white font-semibold">
                  {formatNumber(video.like_count || 0)}
                </span>
              </button>

              <Link
                href={`/videos/${video.id}`}
                className="flex flex-col items-center gap-1"
              >
                <MessageCircle className="w-8 h-8 text-white" />
                <span className="text-xs text-white font-semibold">
                  {formatNumber(video.comment_count || 0)}
                </span>
              </Link>

              <button type="button" className="flex flex-col items-center gap-1">
                <Share2 className="w-7 h-7 text-white" />
                <span className="text-xs text-white font-semibold">Partager</span>
              </button>

              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="mt-1 p-2 rounded-full bg-black/40"
              >
                {muted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>
            </div>

            {/* Infos bas gauche */}
            <div className="absolute left-3 right-20 bottom-24 z-20">
              <Link
                href={`/profile/${video.user_id}`}
                className="font-semibold text-white text-[15px]"
              >
                @{name}
              </Link>
              {video.caption && (
                <p className="mt-1 text-sm text-white/90 line-clamp-3">
                  {video.caption}
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
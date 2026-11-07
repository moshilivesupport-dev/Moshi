"use client";

import { useRef, useState, useEffect } from "react";
import { Heart, MessageCircle, Share2, Volume2, VolumeX } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export interface FeedVideo {
  id: string;
  url: string;
  caption?: string | null;
  duration_seconds: number;
  like_count: number;
  comment_count: number;
  view_count: number;
  user?: { username?: string; avatar_url?: string };
}

interface FeedProps {
  videos: FeedVideo[];
  /** Ids des vidéos déjà aimées par l'utilisateur connecté */
  likedIds?: string[];
  /** null = visiteur non connecté */
  userId?: string | null;
}

export function VideoFeed({ videos, likedIds = [], userId = null }: FeedProps) {
  const [muted, setMuted] = useState(true);

  if (!videos.length) {
    return (
      <div className="card text-center py-20 text-muted">
        Aucune vidéo pour le moment.
        <br />
        <Link href="/videos/new" className="text-coral text-sm mt-2 inline-block">
          Publier la première
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-4rem)] md:h-[calc(100dvh-5rem)] overflow-y-scroll snap-y snap-mandatory scroll-smooth">
      {videos.map((v) => (
        <VideoSlide
          key={v.id}
          video={v}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          initiallyLiked={likedIds.includes(v.id)}
          userId={userId}
        />
      ))}
    </div>
  );
}

function VideoSlide({
  video,
  muted,
  onToggleMute,
  initiallyLiked,
  userId,
}: {
  video: FeedVideo;
  muted: boolean;
  onToggleMute: () => void;
  initiallyLiked: boolean;
  userId: string | null;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const supabase = createClient();
  const [liked, setLiked] = useState(initiallyLiked);
  const [likeCount, setLikeCount] = useState(video.like_count);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().catch(() => {});
        } else {
          el.pause();
          el.currentTime = 0;
        }
      },
      { threshold: 0.65 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toggleLike = async () => {
    if (!userId) {
      router.push("/auth/login");
      return;
    }
    if (busy) return;
    setBusy(true);

    // Mise à jour immédiate de l'écran, annulée si la base refuse
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)));

    const { error } = next
      ? await supabase.from("video_likes").insert({ video_id: video.id, user_id: userId })
      : await supabase.from("video_likes").delete().eq("video_id", video.id).eq("user_id", userId);

    if (error) {
      setLiked(!next);
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)));
    }
    setBusy(false);
  };

  const share = async () => {
    const url = `${window.location.origin}/videos/${video.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: "Vidéo Moshi" });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // partage annulé par l'utilisateur
    }
  };

  return (
    <section className="relative h-full w-full snap-start snap-always flex items-center justify-center bg-black">
      <video
        ref={ref}
        src={video.url}
        className="absolute inset-0 w-full h-full object-contain"
        loop
        playsInline
        muted={muted}
        preload="metadata"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
        <button onClick={toggleLike} aria-label="J'aime" className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
            <Heart className={`w-6 h-6 ${liked ? "fill-coral text-coral" : "text-white"}`} />
          </div>
          <span className="text-[10px] text-white">{formatNumber(likeCount)}</span>
        </button>
        <Link href={`/videos/${video.id}`} aria-label="Commentaires" className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-[10px] text-white">{formatNumber(video.comment_count)}</span>
        </Link>
        <button onClick={share} aria-label="Partager" className="relative w-11 h-11 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
          <Share2 className="w-5 h-5 text-white" />
          {copied && (
            <span className="absolute right-12 whitespace-nowrap text-[10px] bg-black/80 text-white px-2 py-1 rounded-full">
              Lien copié
            </span>
          )}
        </button>
        <button onClick={onToggleMute} aria-label={muted ? "Activer le son" : "Couper le son"} className="w-11 h-11 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
          {muted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
        </button>
      </div>

      <div className="absolute left-0 right-16 bottom-6 px-4 z-10">
        <p className="text-sm font-semibold text-white">@{video.user?.username || "user"}</p>
        {video.caption && <p className="text-sm text-white/90 mt-1 line-clamp-2">{video.caption}</p>}
        <p className="text-[10px] text-white/50 mt-1">{video.duration_seconds}s</p>
      </div>
    </section>
  );
}

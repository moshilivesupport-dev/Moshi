"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Share2,
  Play,
  Music,
  Volume2,
  VolumeX,
  Bookmark,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import FollowButton from "@/components/social/FollowButton";

export type FeedItem = {
  id: string;
  title?: string | null;
  description?: string | null;
  media_url?: string | null;
  views_count?: number | null;
  likes_count?: number | null;
  comments_count?: number | null;
  bookmark_count?: number | null;
  share_count?: number | null;
  user_id: string;
  profiles?: {
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
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [videos, setVideos] = useState<FeedItem[]>(initialItems || []);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(initialItems ? false : true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // 1. Charger l'utilisateur connecté
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, [supabase]);

  // 2. Charger les vidéos avec les VRAIS compteurs
  const loadVideos = useCallback(async () => {
    if (initialItems && initialItems.length > 0) return;
    setLoading(true);

    const { data } = await supabase
      .from("videos")
      .select(
        `id, url, caption, like_count, comment_count, view_count, user_id, bookmark_count, share_count, profiles:user_id (username, avatar_url, full_name)`
      )
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(30);

    const rows = (data || []).map((v: any) => ({
      ...v,
      media_url: v.url,
      views_count: v.view_count || 0,
      likes_count: v.like_count || 0,
      comments_count: v.comment_count || 0,
      bookmark_count: v.bookmark_count || 0,
      share_count: v.share_count || 0,
      profiles: Array.isArray(v.profiles) ? v.profiles[0] : v.profiles,
    }));
    setVideos(rows);
    setLoading(false);
  }, [supabase, initialItems]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // 3. Observer la vidéo active pour l'autoplay
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

  // 4. Fonction LIKER (sauvegarde en BDD)
  const toggleLike = useCallback(
    async (videoId: string) => {
      if (!currentUser) {
        router.push("/auth/login");
        return;
      }

      const isCurrentlyLiked = liked[videoId];

      // Mise à jour visuelle immédiate
      setLiked((prev) => ({ ...prev, [videoId]: !isCurrentlyLiked }));
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoId
            ? {
                ...v,
                likes_count:
                  (v.likes_count || 0) + (isCurrentlyLiked ? -1 : 1),
              }
            : v
        )
      );

      // Sauvegarde en base de données
      try {
        if (isCurrentlyLiked) {
          await supabase
            .from("video_likes")
            .delete()
            .eq("video_id", videoId)
            .eq("user_id", currentUser.id);
        } else {
          await supabase
            .from("video_likes")
            .insert({ video_id: videoId, user_id: currentUser.id });
        }
      } catch (err) {
        console.error("Erreur like:", err);
      }
    },
    [currentUser, liked, supabase, router]
  );

  // 5. Fonction BOOKMARK (sauvegarde en BDD)
  const toggleSave = useCallback(
    async (videoId: string) => {
      if (!currentUser) {
        router.push("/auth/login");
        return;
      }

      const isCurrentlySaved = saved[videoId];

      // Mise à jour visuelle immédiate
      setSaved((prev) => ({ ...prev, [videoId]: !isCurrentlySaved }));
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoId
            ? {
                ...v,
                bookmark_count:
                  (v.bookmark_count || 0) + (isCurrentlySaved ? -1 : 1),
              }
            : v
        )
      );

      // Sauvegarde en base de données
      try {
        if (isCurrentlySaved) {
          await supabase
            .from("video_bookmarks")
            .delete()
            .eq("video_id", videoId)
            .eq("user_id", currentUser.id);
        } else {
          await supabase
            .from("video_bookmarks")
            .insert({ video_id: videoId, user_id: currentUser.id });
        }
      } catch (err) {
        console.error("Erreur bookmark:", err);
      }
    },
    [currentUser, saved, supabase, router]
  );

  // 6. Fonction PARTAGER (Web Share API)
  const handleShare = useCallback(
    async (videoId: string, videoName: string) => {
      const shareUrl = `${window.location.origin}/videos/${videoId}`;
      const shareData = {
        title: `Vidéo de @${videoName}`,
        text: `Regarde cette vidéo sur Moshi !`,
        url: shareUrl,
      };

      // Incrémenter le compteur de partages
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoId
            ? { ...v, share_count: (v.share_count || 0) + 1 }
            : v
        )
      );

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (err) {
          // Utilisateur a annulé
        }
      } else {
        // Fallback : copier le lien
        try {
          await navigator.clipboard.writeText(shareUrl);
          alert("Lien copié dans le presse-papier !");
        } catch (err) {
          console.error(err);
        }
      }
    },
    []
  );

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
        <Link
          href="/videos/new"
          className="text-red-500 font-semibold text-sm"
        >
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

            {/* Bouton SON en haut à droite */}
            <button
              onClick={() => setMuted(!muted)}
              className="absolute top-16 right-4 z-30 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition"
              title={muted ? "Activer le son" : "Couper le son"}
            >
              {muted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>

            {/* BOUTONS À DROITE */}
            <div className="absolute right-2 bottom-24 z-20 flex flex-col items-center gap-4">
              {/* Avatar + Follow */}
              <div className="relative mb-2">
                <Link
                  href={`/profile/${video.user_id}`}
                  className="relative block w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-neutral-800"
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
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                  <FollowButton
                    targetUserId={video.user_id}
                    currentUserId={currentUser?.id}
                    variant="small"
                  />
                </div>
              </div>

              {/* Like */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLike(video.id);
                }}
                className="flex flex-col items-center gap-0.5 active:scale-90 transition"
              >
                <Heart
                  className={cn(
                    "w-9 h-9 transition-all drop-shadow-lg",
                    liked[video.id]
                      ? "fill-red-500 text-red-500 scale-110"
                      : "text-white"
                  )}
                />
                <span className="text-xs text-white font-semibold drop-shadow-md">
                  {formatNumber(video.likes_count || 0)}
                </span>
              </button>

              {/* Commentaires */}
              <Link
                href={`/videos/${video.id}`}
                className="flex flex-col items-center gap-0.5 active:scale-90 transition"
              >
                <MessageCircle className="w-9 h-9 text-white drop-shadow-lg" />
                <span className="text-xs text-white font-semibold drop-shadow-md">
                  {formatNumber(video.comments_count || 0)}
                </span>
              </Link>

              {/* Bookmark / Sauvegarder */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSave(video.id);
                }}
                className="flex flex-col items-center gap-0.5 active:scale-90 transition"
              >
                <Bookmark
                  className={cn(
                    "w-9 h-9 transition-all drop-shadow-lg",
                    saved[video.id]
                      ? "fill-white text-white"
                      : "text-white"
                  )}
                />
                <span className="text-xs text-white font-semibold drop-shadow-md">
                  {formatNumber(video.bookmark_count || 0)}
                </span>
              </button>

              {/* Partager */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare(video.id, name);
                }}
                className="flex flex-col items-center gap-0.5 active:scale-90 transition"
              >
                <Share2 className="w-8 h-8 text-white drop-shadow-lg" />
                <span className="text-xs text-white font-semibold drop-shadow-md">
                  {formatNumber(video.share_count || 0)}
                </span>
              </button>

              {/* Disque musical animé */}
              <div className="w-11 h-11 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center animate-spin-slow mt-2 shadow-lg">
                <Music className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* INFOS EN BAS À GAUCHE */}
            <div className="absolute left-4 right-24 bottom-16 z-20 space-y-2">
              <Link
                href={`/profile/${video.user_id}`}
                className="font-bold text-white text-base hover:underline drop-shadow-md inline-block"
              >
                @{name}
              </Link>
              {(video.description || video.title) && (
                <p className="text-sm text-white/90 line-clamp-2 drop-shadow-md">
                  {video.description || video.title}
                </p>
              )}
              <div className="flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-white" />
                <p className="text-xs text-white/80 truncate max-w-[200px]">
                  Son original - {name}
                </p>
              </div>
            </div>
          </section>
        );
      })}

      <style jsx>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 5s linear infinite;
        }
      `}</style>
    </div>
  );
}

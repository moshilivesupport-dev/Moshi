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
  Download,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import FollowButton from "@/components/social/FollowButton";
import CommentsSheet from "@/components/video/CommentsSheet";

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

type VideoRow = {
  id: string;
  url?: string | null;
  media_url?: string | null;
  caption?: string | null;
  like_count?: number | null;
  comment_count?: number | null;
  view_count?: number | null;
  share_count?: number | null;
  user_id: string;
  profiles?: {
    id?: string;
    username: string | null;
    avatar_url: string | null;
    full_name: string | null;
  } | null;
};

export default function HomeFeed({
  initialItems,
}: {
  initialItems?: FeedItem[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [videos, setVideos] = useState<VideoRow[]>(
    (initialItems as VideoRow[]) || []
  );
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(!initialItems);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [commentsOpenVideoId, setCommentsOpenVideoId] = useState<string | null>(
    null
  );

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user ? { id: user.id } : null);
    })();
  }, [supabase]);

  const loadUserReactions = useCallback(
    async (userId: string) => {
      const [{ data: likesData }, { data: bookmarksData }] = await Promise.all([
        supabase.from("video_likes").select("video_id").eq("user_id", userId),
        supabase
          .from("video_bookmarks")
          .select("video_id")
          .eq("user_id", userId),
      ]);

      const likedMap: Record<string, boolean> = {};
      likesData?.forEach((l: { video_id: string }) => {
        likedMap[l.video_id] = true;
      });
      setLiked(likedMap);

      const savedMap: Record<string, boolean> = {};
      bookmarksData?.forEach((b: { video_id: string }) => {
        savedMap[b.video_id] = true;
      });
      setSaved(savedMap);
    },
    [supabase]
  );

  const loadVideos = useCallback(async () => {
    if (initialItems && initialItems.length > 0) {
      setLoading(false);
      if (currentUser) await loadUserReactions(currentUser.id);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("videos")
      .select(
        `id, url, caption, like_count, comment_count, view_count, user_id,
         profiles:user_id ( id, username, avatar_url, full_name )`
      )
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Erreur videos:", error);
      setLoading(false);
      return;
    }

    const rows: VideoRow[] = (data || []).map((v: Record<string, unknown>) => {
      const profiles = v.profiles as
        | VideoRow["profiles"]
        | VideoRow["profiles"][]
        | null;
      return {
        ...(v as VideoRow),
        media_url: (v.url as string) || null,
        profiles: Array.isArray(profiles) ? profiles[0] : profiles,
      };
    });

    setVideos(rows);

    if (currentUser) {
      await loadUserReactions(currentUser.id);
    }

    setLoading(false);
  }, [supabase, currentUser, initialItems, loadUserReactions]);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

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
      if (!currentUser) {
        router.push("/auth/login");
        return;
      }

      const wasLiked = !!liked[videoId];

      setLiked((prev) => ({ ...prev, [videoId]: !wasLiked }));
      setVideos((prev) =>
        prev.map((v) =>
          v.id === videoId
            ? {
                ...v,
                like_count: Math.max(
                  0,
                  (v.like_count || 0) + (wasLiked ? -1 : 1)
                ),
              }
            : v
        )
      );

      const { error } = wasLiked
        ? await supabase
            .from("video_likes")
            .delete()
            .eq("video_id", videoId)
            .eq("user_id", currentUser.id)
        : await supabase.from("video_likes").insert({
            video_id: videoId,
            user_id: currentUser.id,
          });

      if (error) {
        console.error("like error:", error);
        setLiked((prev) => ({ ...prev, [videoId]: wasLiked }));
        setVideos((prev) =>
          prev.map((v) =>
            v.id === videoId
              ? {
                  ...v,
                  like_count: Math.max(
                    0,
                    (v.like_count || 0) + (wasLiked ? 1 : -1)
                  ),
                }
              : v
          )
        );
        alert(error.message);
      }
    },
    [currentUser, liked, supabase, router]
  );

  const toggleSave = useCallback(
    async (videoId: string) => {
      if (!currentUser) {
        router.push("/auth/login");
        return;
      }

      const wasSaved = !!saved[videoId];
      setSaved((prev) => ({ ...prev, [videoId]: !wasSaved }));

      const { error } = wasSaved
        ? await supabase
            .from("video_bookmarks")
            .delete()
            .eq("video_id", videoId)
            .eq("user_id", currentUser.id)
        : await supabase.from("video_bookmarks").insert({
            video_id: videoId,
            user_id: currentUser.id,
          });

      if (error) {
        console.error("bookmark error:", error);
        setSaved((prev) => ({ ...prev, [videoId]: wasSaved }));
        alert(error.message);
      }
    },
    [currentUser, saved, supabase, router]
  );

  const handleShare = useCallback(async (videoId: string, videoName: string) => {
    const shareUrl = `${window.location.origin}/videos/${videoId}`;
    const shareData = {
      title: `Video de @${videoName}`,
      text: "Regarde sur Moshi !",
      url: shareUrl,
    };

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
      } catch {
        /* annule */
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert("Lien copie !");
      } catch {
        /* ignore */
      }
    }
  }, []);

  const handleDownload = useCallback(
    (videoUrl: string | null | undefined, videoId: string) => {
      if (!videoUrl) return;
      const link = document.createElement("a");
      link.href = videoUrl;
      link.download = `moshi_${videoId}.mp4`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    []
  );

  if (loading) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!videos.length) {
    return (
      <div className="h-[100dvh] bg-black flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Play className="w-10 h-10 text-neutral-600" />
        <p className="text-neutral-400">Aucune video pour le moment</p>
        <Link href="/videos/new" className="text-red-500 font-semibold text-sm">
          Publier la premiere
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
        const mediaUrl = video.media_url || video.url || "";

        return (
          <section
            key={video.id}
            data-index={index}
            className="relative h-[100dvh] w-full snap-start snap-always flex items-center justify-center bg-black"
          >
            {mediaUrl ? (
              <video
                src={mediaUrl}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                loop
                muted={muted}
                autoPlay={isActive}
                ref={(el) => {
                  if (!el) return;
                  if (isActive) el.play().catch(() => {});
                  else {
                    el.pause();
                    el.currentTime = 0;
                  }
                }}
              />
            ) : null}

            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="absolute top-16 right-3 z-30 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition"
            >
              {muted ? (
                <VolumeX className="w-4 h-4 text-white" />
              ) : (
                <Volume2 className="w-4 h-4 text-white" />
              )}
            </button>

            {/* Actions droite taille TikTok */}
            <div className="absolute right-2 bottom-28 z-20 flex flex-col items-center gap-3.5">
              <div className="relative mb-1">
                <Link
                  href={`/profile/${video.user_id}`}
                  className="block w-11 h-11 rounded-full border-2 border-white overflow-hidden bg-neutral-800"
                >
                  {author?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={author.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </Link>
                {currentUser?.id !== video.user_id && (
                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2">
                    <FollowButton
                      targetUserId={video.user_id}
                      currentUserId={currentUser?.id}
                      variant="small"
                    />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void toggleLike(video.id);
                }}
                className="flex flex-col items-center gap-0.5 active:scale-90 transition"
              >
                <Heart
                  className={cn(
                    "w-7 h-7 drop-shadow-md",
                    liked[video.id]
                      ? "fill-red-500 text-red-500"
                      : "text-white"
                  )}
                />
                <span className="text-[11px] text-white font-semibold drop-shadow">
                  {formatNumber(video.like_count || 0)}
                </span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCommentsOpenVideoId(video.id);
                }}
                className="flex flex-col items-center gap-0.5 active:scale-90 transition"
              >
                <MessageCircle className="w-7 h-7 text-white drop-shadow-md" />
                <span className="text-[11px] text-white font-semibold drop-shadow">
                  {formatNumber(video.comment_count || 0)}
                </span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void toggleSave(video.id);
                }}
                className="flex flex-col items-center gap-0.5 active:scale-90 transition"
              >
                <Bookmark
                  className={cn(
                    "w-6 h-6 drop-shadow-md",
                    saved[video.id] ? "fill-white text-white" : "text-white"
                  )}
                />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleShare(video.id, name);
                }}
                className="flex flex-col items-center gap-0.5 active:scale-90 transition"
              >
                <Share2 className="w-6 h-6 text-white drop-shadow-md" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(mediaUrl, video.id);
                }}
                className="flex flex-col items-center gap-0.5 active:scale-90 transition"
              >
                <Download className="w-6 h-6 text-white drop-shadow-md" />
              </button>

              <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-600 flex items-center justify-center animate-spin-slow mt-1">
                <Music className="w-4 h-4 text-white" />
              </div>
            </div>

            <div className="absolute left-3 right-20 bottom-24 z-20 space-y-1.5">
              <Link
                href={`/profile/${video.user_id}`}
                className="font-bold text-white text-[15px] hover:underline drop-shadow-md inline-block"
              >
                @{name}
              </Link>
              {video.caption && (
                <p className="text-[13px] text-white/90 line-clamp-2 drop-shadow-md">
                  {video.caption}
                </p>
              )}
              <div className="flex items-center gap-1.5">
                <Music className="w-3 h-3 text-white" />
                <p className="text-[11px] text-white/80 truncate max-w-[200px]">
                  Son original - {name}
                </p>
              </div>
            </div>
          </section>
        );
      })}

      {commentsOpenVideoId && (
        <CommentsSheet
          videoId={commentsOpenVideoId}
          isOpen={true}
          onClose={() => setCommentsOpenVideoId(null)}
          currentUser={currentUser}
          onCommentAdded={() => {
            setVideos((prev) =>
              prev.map((v) =>
                v.id === commentsOpenVideoId
                  ? { ...v, comment_count: (v.comment_count || 0) + 1 }
                  : v
              )
            );
          }}
        />
      )}

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
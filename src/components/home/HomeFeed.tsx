
"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Radio,
} from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { getFlag } from "@/lib/utils";
import CommentsSheet from "@/components/video/CommentsSheet";

interface FeedItem {
  id: string;
  type: "video" | "live";
  url: string;
  caption: string | null;
  like_count: number;
  comment_count: number;
  user_id: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
    full_name: string | null;
    country?: string | null;
  } | null;
}

interface FeedVideoProps {
  item: FeedItem;
  muted: boolean;
  onToggleMute: (video: HTMLVideoElement) => void;
  children: React.ReactNode;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(".0", "") + "M";
  }

  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(".0", "") + "K";
  }

  return num.toString();
}

function FeedVideo({
  item,
  muted,
  onToggleMute,
  children,
}: FeedVideoProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    if (!("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsVisible(
          entry.isIntersecting && entry.intersectionRatio >= 0.65
        );
      },
      {
        threshold: [0, 0.25, 0.5, 0.65, 0.85, 1],
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = muted;

    if (isVisible) {
      const playPromise = video.play();

      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          if (error?.name !== "AbortError") {
            console.warn("Lecture vidéo impossible :", error);
          }
        });
      }
    } else {
      video.pause();
    }
  }, [isVisible, muted]);

  useEffect(() => {
    const video = videoRef.current;
    return () => video?.pause();
  }, []);

  const handleToggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    onToggleMute(video);
  };

  return (
    <section
      ref={sectionRef}
      className="moshi-video relative bg-black"
    >
      <video
        ref={videoRef}
        src={item.url}
        className="absolute inset-0 h-full w-full object-cover"
        loop
        muted={muted}
        playsInline
        preload="metadata"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

      <button
        type="button"
        onClick={handleToggleMute}
        className="absolute right-4 top-20 z-30 moshi-glass flex h-10 w-10 items-center justify-center rounded-full text-white"
        aria-label={muted ? "Activer le son" : "Couper le son"}
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      {children}
    </section>
  );
}

export default function HomeFeed() {
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [pendingLikes, setPendingLikes] = useState<Record<string, boolean>>({});
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [activeCommentsVideoId, setActiveCommentsVideoId] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!cancelled) {
        setCurrentUser(user ? { id: user.id } : null);
      }
    };

    void getUser();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const loadFeed = useCallback(async () => {
    setLoading(true);

    try {
      const { data: videosData, error: videosError } = await supabase
        .from("videos")
        .select("id, url, caption, like_count, comment_count, user_id, created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(30);

      if (videosError) throw videosError;

      const { data: livesData, error: livesError } = await supabase
        .from("lives")
        .select("id, title, host_id")
        .eq("status", "live");

      if (livesError) throw livesError;

      const allUserIds = [
        ...(livesData || []).map((live) => live.host_id),
        ...(videosData || []).map((video) => video.user_id),
      ];

      const uniqueUserIds = [...new Set(allUserIds)];

      const profilesMap: Record<string, FeedItem["profiles"]> = {};

      if (uniqueUserIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, full_name, country")
          .in("id", uniqueUserIds);

        if (profilesError) throw profilesError;

        (profilesData || []).forEach((profile) => {
          profilesMap[profile.id] = profile;
        });
      }

      const livesItems: FeedItem[] = (livesData || []).map((live) => ({
        id: live.id,
        type: "live",
        url: "",
        caption: live.title,
        like_count: 0,
        comment_count: 0,
        user_id: live.host_id,
        profiles: profilesMap[live.host_id] || null,
      }));

      const videosItems: FeedItem[] = (videosData || []).map((video) => ({
        id: video.id,
        type: "video",
        url: video.url,
        caption: video.caption,
        like_count: video.like_count || 0,
        comment_count: video.comment_count || 0,
        user_id: video.user_id,
        profiles: profilesMap[video.user_id] || null,
      }));

      setItems([...livesItems, ...videosItems]);

      if (currentUser) {
        const { data: likesData, error: likesError } = await supabase
          .from("video_likes")
          .select("video_id")
          .eq("user_id", currentUser.id);

        if (likesError) throw likesError;

        const likedMap: Record<string, boolean> = {};

        (likesData || []).forEach((like) => {
          likedMap[like.video_id] = true;
        });

        setLiked(likedMap);
      } else {
        setLiked({});
      }
    } catch (error) {
      console.error("Erreur chargement du fil :", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, currentUser]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const toggleMute = (video: HTMLVideoElement) => {
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setMuted(nextMuted);
  };

  const toggleLike = async (videoId: string) => {
    if (!currentUser || pendingLikes[videoId]) return;

    const isCurrentlyLiked = !!liked[videoId];

    setPendingLikes((previous) => ({
      ...previous,
      [videoId]: true,
    }));

    setLiked((previous) => ({
      ...previous,
      [videoId]: !isCurrentlyLiked,
    }));

    setItems((previous) =>
      previous.map((item) =>
        item.id === videoId
          ? {
              ...item,
              like_count: Math.max(
                0,
                item.like_count + (isCurrentlyLiked ? -1 : 1)
              ),
            }
          : item
      )
    );

    try {
      if (isCurrentlyLiked) {
        const { error } = await supabase
          .from("video_likes")
          .delete()
          .eq("video_id", videoId)
          .eq("user_id", currentUser.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("video_likes")
          .insert({
            video_id: videoId,
            user_id: currentUser.id,
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error("Erreur J'aime :", error);

      setLiked((previous) => ({
        ...previous,
        [videoId]: isCurrentlyLiked,
      }));

      setItems((previous) =>
        previous.map((item) =>
          item.id === videoId
            ? {
                ...item,
                like_count: Math.max(
                  0,
                  item.like_count + (isCurrentlyLiked ? 1 : -1)
                ),
              }
            : item
        )
      );
    } finally {
      setPendingLikes((previous) => ({
        ...previous,
        [videoId]: false,
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#9D7BEA] border-t-transparent" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center bg-black px-6 text-center">
        <p className="font-medium text-neutral-400">
          Aucune vidéo pour le moment
        </p>
      </div>
    );
  }

  return (
    <div className="moshi-feed">
      {items.map((item) => {
        const isLiked = !!liked[item.id];
        const author = item.profiles;
        const authorName =
          author?.username || author?.full_name || "user";

        if (item.type === "live") {
          return (
            <section
              key={item.id}
              className="moshi-video relative flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-900 to-black"
            >
              <Link
                href={`/live/${item.id}`}
                className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="mb-4 flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-red-500 shadow-2xl">
                  <Radio size={40} className="text-white" />
                </div>

                <span className="mb-3 flex items-center gap-2 rounded-full bg-red-500 px-4 py-1 text-sm font-bold text-white">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  LIVE
                </span>

                <h2 className="mb-2 text-2xl font-extrabold text-white">
                  {item.caption}
                </h2>

                <p className="font-semibold text-white/80">
                  par @{authorName}
                </p>

                <span className="mt-6 rounded-full bg-white px-8 py-3 font-bold text-black shadow-lg">
                  Rejoindre le live
                </span>
              </Link>
            </section>
          );
        }

        return (
          <FeedVideo
            key={item.id}
            item={item}
            muted={muted}
            onToggleMute={toggleMute}
          >
            <div className="absolute bottom-32 right-3 z-20 flex flex-col items-center gap-4">
              <Link
                href={`/profile/${item.user_id}`}
                className="h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-neutral-800"
              >
                {author?.avatar_url ? (
                  <Image
                    src={author.avatar_url}
                    alt={authorName}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center font-bold text-white">
                    {authorName.charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>

              <button
                type="button"
                onClick={() => void toggleLike(item.id)}
                disabled={!currentUser || !!pendingLikes[item.id]}
                className="flex flex-col items-center gap-1 disabled:opacity-70"
                aria-label={isLiked ? "Retirer le J'aime" : "Aimer cette vidéo"}
              >
                <motion.div
                  whileTap={{ scale: 0.8 }}
                  className="moshi-glass flex h-12 w-12 items-center justify-center rounded-full"
                >
                  <Heart
                    size={24}
                    className={
                      isLiked
                        ? "fill-[#FF8FB1] text-[#FF8FB1]"
                        : "text-white"
                    }
                  />
                </motion.div>

                <span className="text-xs font-semibold text-white">
                  {formatNumber(item.like_count)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveCommentsVideoId(item.id)}
                className="flex flex-col items-center gap-1"
                aria-label="Voir les commentaires"
              >
                <div className="moshi-glass flex h-12 w-12 items-center justify-center rounded-full">
                  <MessageCircle size={24} className="text-white" />
                </div>

                <span className="text-xs font-semibold text-white">
                  {formatNumber(item.comment_count)}
                </span>
              </button>

              <button
                type="button"
                className="flex flex-col items-center gap-1"
                onClick={async () => {
                  const url = `${window.location.origin}/videos/${item.id}`;

                  try {
                    if (navigator.share) {
                      await navigator.share({
                        title: "Vidéo Moshi",
                        url,
                      });
                    } else {
                      await navigator.clipboard.writeText(url);
                    }
                  } catch (error) {
                    if ((error as Error).name !== "AbortError") {
                      console.error("Erreur partage :", error);
                    }
                  }
                }}
                aria-label="Partager la vidéo"
              >
                <div className="moshi-glass flex h-12 w-12 items-center justify-center rounded-full">
                  <Share2 size={22} className="text-white" />
                </div>
              </button>
            </div>

            <div className="absolute bottom-28 left-4 right-20 z-20 space-y-2">
              <Link
                href={`/profile/${item.user_id}`}
                className="text-base font-bold text-white drop-shadow-md hover:underline"
              >
                @{authorName}{" "}
                {author?.country && getFlag(author.country)}
              </Link>

              {item.caption && (
                <p className="line-clamp-2 text-sm text-white/90 drop-shadow-md">
                  {item.caption}
                </p>
              )}
            </div>
          </FeedVideo>
        );
      })}

      {activeCommentsVideoId && (
        <CommentsSheet
          videoId={activeCommentsVideoId}
          onClose={() => setActiveCommentsVideoId(null)}
        />
      )}
    </div>
  );
}

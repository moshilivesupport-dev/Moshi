
"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
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

interface HomeFeedProps {
  mode?: "forYou" | "following";
}

function formatNumber(num: number) {
  const safeNumber = Math.max(0, Number(num) || 0);

  if (safeNumber >= 1_000_000) {
    return (safeNumber / 1_000_000).toFixed(1).replace(".0", "") + "M";
  }

  if (safeNumber >= 1_000) {
    return (safeNumber / 1_000).toFixed(1).replace(".0", "") + "K";
  }

  return String(safeNumber);
}

function FeedVideo({
  item,
  muted,
  onToggleMute,
  onQualifiedView,
  children,
}: {
  item: FeedItem;
  muted: boolean;
  onToggleMute: (video: HTMLVideoElement) => void;
  onQualifiedView: (videoId: string) => void;
  children?: ReactNode;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(
          entry.isIntersecting && entry.intersectionRatio >= 0.6
        );
      },
      {
        threshold: [0, 0.25, 0.5, 0.6, 0.75, 1],
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  // Comptabilisation après 1,5 seconde de visibilité réelle.
  useEffect(() => {
    if (viewTimerRef.current) {
      clearTimeout(viewTimerRef.current);
      viewTimerRef.current = null;
    }

    if (!isVisible) return;

    viewTimerRef.current = setTimeout(() => {
      onQualifiedView(item.id);
      viewTimerRef.current = null;
    }, 1500);

    return () => {
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
        viewTimerRef.current = null;
      }
    };
  }, [isVisible, item.id, onQualifiedView]);

  // Lecture et pause automatiques.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = muted;

    if (!isVisible) {
      video.pause();
      return;
    }

    let cancelled = false;

    const play = async () => {
      try {
        await video.play();
      } catch (error) {
        if (
          !cancelled &&
          error instanceof Error &&
          error.name !== "AbortError"
        ) {
          console.warn("Lecture vidéo impossible :", error);
        }
      }
    };

    void play();

    return () => {
      cancelled = true;
      video.pause();
    };
  }, [isVisible, muted]);

  useEffect(() => {
    const video = videoRef.current;

    return () => {
      if (viewTimerRef.current) {
        clearTimeout(viewTimerRef.current);
      }

      video?.pause();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="moshi-video relative w-full overflow-hidden bg-black"
      style={{
        height: "100%",
        minHeight: "100%",
        scrollSnapAlign: "start",
      }}
    >
      <video
        ref={videoRef}
        src={item.url}
        className="absolute inset-0 h-full w-full object-cover"
        loop
        muted={muted}
        playsInline
        preload={isVisible ? "auto" : "metadata"}
        onError={(event) => {
          console.warn(
            "Erreur de chargement vidéo :",
            event.currentTarget.error
          );
        }}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      <button
        type="button"
        onClick={() => {
          const video = videoRef.current;
          if (video) onToggleMute(video);
        }}
        className="absolute right-4 top-5 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-lg"
        aria-label={muted ? "Activer le son" : "Couper le son"}
      >
        {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
      </button>

      {children}
    </section>
  );
}

export default function HomeFeed({
  mode = "forYou",
}: HomeFeedProps) {
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [pendingLikes, setPendingLikes] = useState<Record<string, boolean>>({});
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [emptyMessage, setEmptyMessage] = useState(
    "Aucune vidéo pour le moment"
  );
  const [activeCommentsVideoId, setActiveCommentsVideoId] =
    useState<string | null>(null);

  const loadRequestRef = useRef(0);

  // Empêche plusieurs appels simultanés pour la même vidéo.
  const viewsInFlightRef = useRef<Set<string>>(new Set());

  // Évite de rappeler la fonction après une vue déjà enregistrée.
  const viewedVideosRef = useRef<Set<string>>(new Set());

  // Récupération de l'utilisateur connecté.
  useEffect(() => {
    let cancelled = false;

    const getUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) throw error;

        if (!cancelled) {
          setCurrentUser(user ? { id: user.id } : null);
          setAuthLoaded(true);
        }
      } catch (error) {
        console.error("Erreur récupération utilisateur :", error);

        if (!cancelled) {
          setCurrentUser(null);
          setAuthLoaded(true);
        }
      }
    };

    void getUser();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // Enregistre une vue qualifiée dans Supabase.
  const registerVideoView = useCallback(
    async (videoId: string) => {
      if (!currentUser) return;
      if (viewedVideosRef.current.has(videoId)) return;
      if (viewsInFlightRef.current.has(videoId)) return;

      const videoExists = items.some(
        (item) => item.id === videoId && item.type === "video"
      );

      if (!videoExists) return;

      viewsInFlightRef.current.add(videoId);

      try {
        const { error } = await supabase.rpc("increment_video_view", {
          vid_id: videoId,
        });

        if (error) throw error;

        viewedVideosRef.current.add(videoId);
      } catch (error) {
        console.error("Erreur comptabilisation vue vidéo :", error);
      } finally {
        viewsInFlightRef.current.delete(videoId);
      }
    },
    [supabase, currentUser, items]
  );

  // Chargement du fil.
  const loadFeed = useCallback(async () => {
    if (!authLoaded) return;

    const requestId = ++loadRequestRef.current;
    setLoading(true);

    try {
      let followedIds: string[] | null = null;

      if (mode === "following") {
        if (!currentUser) {
          setItems([]);
          setLiked({});
          setEmptyMessage(
            "Connecte-toi pour voir les vidéos des comptes que tu suis."
          );
          return;
        }

        const { data: follows, error: followsError } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", currentUser.id);

        if (followsError) throw followsError;

        followedIds = [
          ...new Set(
            (follows || []).map((follow) => follow.following_id)
          ),
        ];

        if (followedIds.length === 0) {
          setItems([]);
          setLiked({});
          setEmptyMessage(
            "Tu ne suis encore aucun compte. Découvre des créateurs et abonne-toi pour voir leurs vidéos ici."
          );
          return;
        }
      }

      let videosQuery = supabase
        .from("videos")
        .select(
          "id, url, caption, like_count, comment_count, user_id, created_at"
        )
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(30);

      if (followedIds) {
        videosQuery = videosQuery.in("user_id", followedIds);
      }

      const { data: videosData, error: videosError } = await videosQuery;

      if (videosError) throw videosError;

      let livesQuery = supabase
        .from("lives")
        .select("id, title, host_id")
        .eq("status", "live");

      if (followedIds) {
        livesQuery = livesQuery.in("host_id", followedIds);
      }

      const { data: livesData, error: livesError } = await livesQuery;

      if (livesError) throw livesError;

      const userIds = [
        ...(livesData || []).map((live) => live.host_id),
        ...(videosData || []).map((video) => video.user_id),
      ];

      const uniqueIds = [...new Set(userIds)];
      const profilesMap: Record<string, FeedItem["profiles"]> = {};

      if (uniqueIds.length > 0) {
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, full_name, country")
          .in("id", uniqueIds);

        if (error) throw error;

        (profiles || []).forEach((profile) => {
          profilesMap[profile.id] = profile;
        });
      }

      const videos: FeedItem[] = (videosData || []).map((video) => ({
        id: video.id,
        type: "video",
        url: video.url,
        caption: video.caption,
        like_count: video.like_count || 0,
        comment_count: video.comment_count || 0,
        user_id: video.user_id,
        profiles: profilesMap[video.user_id] || null,
      }));

      const lives: FeedItem[] = (livesData || []).map((live) => ({
        id: live.id,
        type: "live",
        url: "",
        caption: live.title,
        like_count: 0,
        comment_count: 0,
        user_id: live.host_id,
        profiles: profilesMap[live.host_id] || null,
      }));

      if (requestId !== loadRequestRef.current) return;

      setItems([...lives, ...videos]);

      if (currentUser) {
        const videoIds = videos.map((video) => video.id);

        if (videoIds.length > 0) {
          const { data: likes, error } = await supabase
            .from("video_likes")
            .select("video_id")
            .eq("user_id", currentUser.id)
            .in("video_id", videoIds);

          if (error) throw error;

          if (requestId !== loadRequestRef.current) return;

          const map: Record<string, boolean> = {};

          (likes || []).forEach((like) => {
            map[like.video_id] = true;
          });

          setLiked(map);
        } else {
          setLiked({});
        }
      } else {
        setLiked({});
      }

      setEmptyMessage(
        mode === "following"
          ? "Les comptes que tu suis n'ont pas encore publié de vidéo ou lancé de live."
          : "Aucune vidéo pour le moment"
      );
    } catch (error) {
      console.error("Erreur chargement du fil :", error);

      if (requestId === loadRequestRef.current) {
        setEmptyMessage(
          "Impossible de charger le fil. Vérifie ta connexion puis réessaie."
        );
      }
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoading(false);
      }
    }
  }, [supabase, currentUser, authLoaded, mode]);

  useEffect(() => {
    void loadFeed();

    return () => {
      loadRequestRef.current += 1;
    };
  }, [loadFeed]);

  // Synchronisation des compteurs depuis la table videos.
  useEffect(() => {
    const channel = supabase
      .channel(`moshi-feed-counts-${mode}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "videos",
        },
        (payload) => {
          const updated = payload.new as {
            id?: string;
            like_count?: number;
            comment_count?: number;
            view_count?: number;
            status?: string;
          };

          if (!updated.id) return;

          if (updated.status && updated.status !== "published") {
            setItems((previous) =>
              previous.filter(
                (item) =>
                  item.type !== "video" || item.id !== updated.id
              )
            );
            return;
          }

          setItems((previous) =>
            previous.map((item) => {
              if (item.type !== "video" || item.id !== updated.id) {
                return item;
              }

              return {
                ...item,
                like_count:
                  typeof updated.like_count === "number"
                    ? updated.like_count
                    : item.like_count,
                comment_count:
                  typeof updated.comment_count === "number"
                    ? updated.comment_count
                    : item.comment_count,
              };
            })
          );
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn(
            "Synchronisation des compteurs momentanément indisponible."
          );
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, mode]);

  // Synchronisation des likes de l'utilisateur connecté.
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel(`moshi-user-likes-${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "video_likes",
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          const row = payload.new as { video_id?: string };

          if (!row.video_id) return;

          setLiked((previous) => ({
            ...previous,
            [row.video_id as string]: true,
          }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "video_likes",
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          const row = payload.old as { video_id?: string };

          if (!row.video_id) return;

          setLiked((previous) => ({
            ...previous,
            [row.video_id as string]: false,
          }));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, currentUser]);

  const toggleMute = (video: HTMLVideoElement) => {
    const next = !video.muted;
    video.muted = next;
    setMuted(next);
  };

  // Like optimiste avec restauration en cas d'erreur.
  const toggleLike = async (videoId: string) => {
    if (!currentUser || pendingLikes[videoId]) return;

    const wasLiked = !!liked[videoId];

    setPendingLikes((previous) => ({
      ...previous,
      [videoId]: true,
    }));

    setLiked((previous) => ({
      ...previous,
      [videoId]: !wasLiked,
    }));

    setItems((previous) =>
      previous.map((item) =>
        item.id === videoId && item.type === "video"
          ? {
              ...item,
              like_count: Math.max(
                0,
                item.like_count + (wasLiked ? -1 : 1)
              ),
            }
          : item
      )
    );

    try {
      if (wasLiked) {
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
        [videoId]: wasLiked,
      }));

      setItems((previous) =>
        previous.map((item) =>
          item.id === videoId && item.type === "video"
            ? {
                ...item,
                like_count: Math.max(
                  0,
                  item.like_count + (wasLiked ? 1 : -1)
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

  const handleCommentAdded = useCallback((videoId: string) => {
    setItems((previous) =>
      previous.map((item) =>
        item.id === videoId && item.type === "video"
          ? {
              ...item,
              comment_count: item.comment_count + 1,
            }
          : item
      )
    );
  }, []);

  if (loading) {
    return (
      <div className="flex h-[calc(100dvh-88px)] items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#9D7BEA] border-t-transparent" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-[calc(100dvh-88px)] flex-col items-center justify-center bg-black px-6 text-center">
        <p className="max-w-sm font-medium leading-relaxed text-neutral-400">
          {emptyMessage}
        </p>

        {mode === "following" && !currentUser && (
          <Link
            href="/login"
            className="moshi-gradient mt-5 rounded-full px-6 py-3 text-sm font-bold text-white"
          >
            Se connecter
          </Link>
        )}
      </div>
    );
  }

  return (
    <div
      className="moshi-feed fixed left-0 right-0 top-0 z-0 bg-black"
      style={{
        height: "calc(100dvh - 88px)",
        scrollSnapType: "y mandatory",
        overflowY: "auto",
        overscrollBehaviorY: "contain",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {items.map((item) => {
        const isLiked = !!liked[item.id];
        const author = item.profiles;
        const authorName =
          author?.username || author?.full_name || "user";

        if (item.type === "live") {
          return (
            <section
              key={item.id}
              className="moshi-video relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-br from-purple-900 via-pink-900 to-black"
              style={{
                height: "100%",
                minHeight: "100%",
                scrollSnapAlign: "start",
              }}
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
            onQualifiedView={registerVideoView}
          >
            <div className="absolute bottom-5 right-3 z-20 flex flex-col items-center gap-4">
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
                aria-label={
                  isLiked ? "Retirer le J'aime" : "Aimer cette vidéo"
                }
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
                    if (
                      error instanceof Error &&
                      error.name !== "AbortError"
                    ) {
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

            <div className="absolute bottom-5 left-4 right-20 z-20 space-y-2">
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
          onCommentAdded={handleCommentAdded}
        />
      )}
    </div>
  );
}

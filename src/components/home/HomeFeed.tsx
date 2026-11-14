"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, MessageCircle, Share2, Play, Music, Volume2, VolumeX, Bookmark, Radio } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import CommentsSheet from "@/components/video/CommentsSheet";

export type FeedItem = {
  id: string;
  type: "video" | "live";
  title?: string | null;
  caption?: string | null;
  url?: string | null;
  room_name?: string | null;
  view_count?: number | null;
  like_count?: number | null;
  comment_count?: number | null;
  created_at?: string;
  user_id: string;
  profiles?: {
    username: string | null;
    avatar_url: string | null;
    full_name: string | null;
  } | null;
};

export default function HomeFeed() {
  const supabase = createClient();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const [items, setItems] = useState<FeedItem[]>([]);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [commentsOpenVideoId, setCommentsOpenVideoId] = useState<string | null>(null);
  const [liveTokens, setLiveTokens] = useState<Record<string, string>>({});

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, [supabase]);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const loadFeed = useCallback(async () => {
    setLoading(true);

    // 1. Vidéos (sans filtre de statut pour être sûr de les avoir toutes)
    const { data: videosData, error: videosError } = await supabase
      .from("videos")
      .select(`id, url, caption, title, like_count, comment_count, view_count, user_id, created_at, profiles:user_id (username, avatar_url, full_name)`)
      .limit(20);

    if (videosError) {
      console.error("Erreur chargement vidéos:", videosError);
    }

    const videos: FeedItem[] = (videosData || []).map((v: any) => ({
      id: v.id,
      type: "video",
      title: v.title,
      caption: v.caption,
      url: v.url,
      view_count: v.view_count || 0,
      like_count: v.like_count || 0,
      comment_count: v.comment_count || 0,
      created_at: v.created_at,
      user_id: v.user_id,
      profiles: Array.isArray(v.profiles) ? v.profiles[0] : v.profiles,
    }));

    // 2. Lives en cours
    const { data: livesData, error: livesError } = await supabase
      .from("live_sessions")
      .select(`id, title, room_name, host_id, created_at, profiles:host_id (username, avatar_url, full_name)`)
      .eq("status", "live")
      .limit(10);

    if (livesError) {
      console.error("Erreur chargement lives:", livesError);
    }

    const lives: FeedItem[] = (livesData || []).map((l: any) => ({
      id: l.id,
      type: "live",
      title: l.title,
      room_name: l.room_name,
      created_at: l.created_at,
      user_id: l.host_id,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      profiles: Array.isArray(l.profiles) ? l.profiles[0] : l.profiles,
    }));

    // 3. Fusionner et mélanger
    const all = shuffleArray([...videos, ...lives]);
    setItems(all);

    // 4. Charger les likes et favoris
    if (currentUser) {
      const { data: likesData } = await supabase.from("video_likes").select("video_id").eq("user_id", currentUser.id);
      const likedMap: Record<string, boolean> = {};
      likesData?.forEach((l: any) => { likedMap[l.video_id] = true; });
      setLiked(likedMap);

      const { data: bookmarksData } = await supabase.from("video_bookmarks").select("video_id").eq("user_id", currentUser.id);
      const savedMap: Record<string, boolean> = {};
      bookmarksData?.forEach((b: any) => { savedMap[b.video_id] = true; });
      setSaved(savedMap);
    }

    setLoading(false);
  }, [supabase, currentUser]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

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
  }, [items]);

  useEffect(() => {
    const activeItem = items[active];
    if (activeItem?.type === "live" && activeItem.room_name && !liveTokens[activeItem.id]) {
      fetch("/api/live/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: activeItem.room_name }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.token) {
            setLiveTokens(prev => ({ ...prev, [activeItem.id]: data.token }));
          }
        })
        .catch(err => console.error("Erreur token live:", err));
    }
  }, [active, items, liveTokens]);

  const toggleLike = useCallback(async (videoId: string) => {
    if (!currentUser) { router.push("/auth/login"); return; }
    const isCurrentlyLiked = liked[videoId];
    setLiked((prev) => ({ ...prev, [videoId]: !isCurrentlyLiked }));
    setItems((prev) => prev.map((v) => v.id === videoId ? { ...v, like_count: (v.like_count || 0) + (isCurrentlyLiked ? -1 : 1) } : v));
    try {
      if (isCurrentlyLiked) {
        await supabase.from("video_likes").delete().eq("video_id", videoId).eq("user_id", currentUser.id);
      } else {
        await supabase.from("video_likes").insert({ video_id: videoId, user_id: currentUser.id });
      }
    } catch (err) { console.error("Erreur like:", err); }
  }, [currentUser, liked, supabase, router]);

  const toggleSave = useCallback(async (videoId: string) => {
    if (!currentUser) { router.push("/auth/login"); return; }
    const isCurrentlySaved = saved[videoId];
    setSaved((prev) => ({ ...prev, [videoId]: !isCurrentlySaved }));
    try {
      if (isCurrentlySaved) {
        await supabase.from("video_bookmarks").delete().eq("video_id", videoId).eq("user_id", currentUser.id);
      } else {
        await supabase.from("video_bookmarks").insert({ video_id: videoId, user_id: currentUser.id });
      }
    } catch (err) { console.error("Erreur bookmark:", err); }
  }, [currentUser, saved, supabase, router]);

  const handleShare = useCallback(async (itemId: string, itemType: string, itemName: string) => {
    const shareUrl = `${window.location.origin}/${itemType === 'live' ? 'live' : 'videos'}/${itemId}`;
    const shareData = { title: `${itemType === 'live' ? 'Live' : 'Vidéo'} de @${itemName}`, url: shareUrl };
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      try { await navigator.clipboard.writeText(shareUrl); alert("Lien copié !"); } catch {}
    }
  }, []);

  if (loading) {
    return <div className="h-[100dvh] bg-black flex items-center justify-center"><div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>;
  }

  if (!items.length) {
    return (
      <div className="h-[100dvh] bg-black flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Play className="w-10 h-10 text-neutral-600" />
        <p className="text-neutral-400">Aucun contenu pour le moment</p>
        <Link href="/create" className="text-red-500 font-semibold text-sm">Publier la première</Link>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory bg-black scrollbar-hide relative">
      {items.map((item, index) => {
        const isActive = index === active;
        const author = item.profiles;
        const name = author?.username || author?.full_name || "user";

        if (item.type === "live") {
          const liveToken = liveTokens[item.id];
          return (
            <section key={item.id} data-index={index} className="relative h-[100dvh] w-full snap-start snap-always flex items-center justify-center bg-black">
              {liveToken ? (
                <LiveKitRoom
                  token={liveToken}
                  serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                  connect={true}
                  video={false}
                  audio={false}
                  className="absolute inset-0"
                >
                  <VideoConference />
                  <RoomAudioRenderer />
                </LiveKitRoom>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <p className="text-white text-sm">Chargement du live...</p>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

              <div className="absolute top-20 left-4 z-30 flex items-center gap-2">
                <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5" /> LIVE
                </div>
              </div>

              <div className="absolute right-2 bottom-24 z-20 flex flex-col items-center gap-4">
                <Link href={`/profile/${item.user_id}`} className="relative block w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-neutral-800">
                  {author?.avatar_url ? <img src={author.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm font-bold">{name.charAt(0).toUpperCase()}</div>}
                </Link>
                <button onClick={() => handleShare(item.id, 'live', name)} className="flex flex-col items-center gap-0.5 active:scale-90 transition">
                  <Share2 className="w-8 h-8 text-white drop-shadow-lg" />
                  <span className="text-xs text-white font-semibold drop-shadow-md">Partager</span>
                </button>
              </div>

              <div className="absolute left-4 right-24 bottom-20 z-20 space-y-2">
                <Link href={`/profile/${item.user_id}`} className="font-bold text-white text-base hover:underline drop-shadow-md inline-block">@{name}</Link>
                <p className="text-sm text-white/90 line-clamp-2 drop-shadow-md">{item.title}</p>
                <Link href={`/live/${item.id}`} className="inline-block mt-2 bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-full">
                  Rejoindre le live
                </Link>
              </div>
            </section>
          );
        }

        const displayText = item.caption || item.title || "";
        return (
          <section key={item.id} data-index={index} className="relative h-[100dvh] w-full snap-start snap-always flex items-center justify-center bg-black">
            {item.url && (
              <video
                ref={(el) => { videoRefs.current[item.id] = el; }}
                src={item.url}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                loop
                muted={muted}
                autoPlay={isActive}
                onClick={(e) => {
                  const v = e.currentTarget;
                  if (v.paused) v.play();
                  else v.pause();
                }}
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

            <button onClick={() => setMuted(!muted)} className="absolute top-20 right-4 z-30 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center">
              {muted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
            </button>

            <div className="absolute right-2 bottom-24 z-20 flex flex-col items-center gap-4">
              <div className="relative mb-2">
                <Link href={`/profile/${item.user_id}`} className="relative block w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-neutral-800">
                  {author?.avatar_url ? <img src={author.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm font-bold">{name.charAt(0).toUpperCase()}</div>}
                </Link>
              </div>

              <button type="button" onClick={() => toggleLike(item.id)} className="flex flex-col items-center gap-0.5 active:scale-90 transition">
                <Heart className={cn("w-9 h-9 transition-all drop-shadow-lg", liked[item.id] ? "fill-red-500 text-red-500 scale-110" : "text-white")} />
                <span className="text-xs text-white font-semibold drop-shadow-md">{formatNumber(item.like_count || 0)}</span>
              </button>

              <button type="button" onClick={() => setCommentsOpenVideoId(item.id)} className="flex flex-col items-center gap-0.5 active:scale-90 transition">
                <MessageCircle className="w-9 h-9 text-white drop-shadow-lg" />
                <span className="text-xs text-white font-semibold drop-shadow-md">{formatNumber(item.comment_count || 0)}</span>
              </button>

              <button type="button" onClick={() => toggleSave(item.id)} className="flex flex-col items-center gap-0.5 active:scale-90 transition">
                <Bookmark className={cn("w-9 h-9 transition-all drop-shadow-lg", saved[item.id] ? "fill-white text-white" : "text-white")} />
                <span className="text-xs text-white font-semibold drop-shadow-md">Enregistrer</span>
              </button>

              <button type="button" onClick={() => handleShare(item.id, 'video', name)} className="flex flex-col items-center gap-0.5 active:scale-90 transition">
                <Share2 className="w-8 h-8 text-white drop-shadow-lg" />
                <span className="text-xs text-white font-semibold drop-shadow-md">Partager</span>
              </button>
            </div>

            <div className="absolute left-4 right-24 bottom-20 z-20 space-y-2">
              <Link href={`/profile/${item.user_id}`} className="font-bold text-white text-base hover:underline drop-shadow-md inline-block">@{name}</Link>
              {displayText && <p className="text-sm text-white/90 line-clamp-2 drop-shadow-md">{displayText}</p>}
              <div className="flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-white" />
                <p className="text-xs text-white/80 truncate max-w-[200px]">Son original - {name}</p>
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
            setItems((prev) => prev.map((v) => v.id === commentsOpenVideoId ? { ...v, comment_count: (v.comment_count || 0) + 1 } : v));
          }}
        />
      )}
    </div>
  );
}
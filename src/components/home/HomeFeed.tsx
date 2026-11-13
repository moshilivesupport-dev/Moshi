"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart, MessageCircle, Share2, Play, Music, Volume2, VolumeX,
  Bookmark, Maximize2
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import CommentsSheet from "@/components/video/CommentsSheet";

export type FeedItem = {
  id: string;
  caption?: string | null;
  url?: string | null;
  view_count?: number | null;
  like_count?: number | null;
  comment_count?: number | null;
  user_id: string;
  profiles?: {
    username: string | null;
    avatar_url: string | null;
    full_name: string | null;
  } | null;
};

export default function HomeFeed({ initialItems }: { initialItems?: FeedItem[] }) {
  const supabase = createClient();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const [videos, setVideos] = useState<FeedItem[]>(initialItems || []);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(initialItems ? false : true);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [commentsOpenVideoId, setCommentsOpenVideoId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, [supabase]);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    
    // ✅ Requête SANS jointure (on charge les vidéos seules)
    const { data: videosData, error } = await supabase
      .from("videos")
      .select("id, url, caption, like_count, comment_count, view_count, user_id")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Erreur chargement vidéos:", error);
      setLoading(false);
      return;
    }

    if (!videosData || videosData.length === 0) {
      setVideos([]);
      setLoading(false);
      return;
    }

    // ✅ On charge les profils séparément
    const userIds = [...new Set(videosData.map((v) => v.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, full_name")
      .in("id", userIds);

    const profilesMap: Record<string, any> = {};
    (profilesData || []).forEach((p) => {
      profilesMap[p.id] = p;
    });

    const rows: FeedItem[] = videosData.map((v) => ({
      id: v.id,
      caption: v.caption,
      url: v.url,
      view_count: v.view_count || 0,
      like_count: v.like_count || 0,
      comment_count: v.comment_count || 0,
      user_id: v.user_id,
      profiles: profilesMap[v.user_id] || null,
    }));

    setVideos(rows);

    // Likes
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

  useEffect(() => { loadVideos(); }, [loadVideos]);

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

  const toggleLike = useCallback(async (videoId: string) => {
    if (!currentUser) { router.push("/auth/login"); return; }
    const isCurrentlyLiked = liked[videoId];
    setLiked((prev) => ({ ...prev, [videoId]: !isCurrentlyLiked }));
    setVideos((prev) => prev.map((v) => v.id === videoId ? { ...v, like_count: (v.like_count || 0) + (isCurrentlyLiked ? -1 : 1) } : v));
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

  const handleShare = useCallback(async (videoId: string, videoName: string) => {
    const shareUrl = `${window.location.origin}/videos/${videoId}`;
    const shareData = { title: `Vidéo de @${videoName}`, text: "Regarde sur Moshi !", url: shareUrl };
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      try { await navigator.clipboard.writeText(shareUrl); alert("Lien copié !"); } catch {}
    }
  }, []);

  const toggleFullscreen = useCallback((videoId: string) => {
    const video = videoRefs.current[videoId];
    if (!video) return;
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if ((video as any).webkitEnterFullscreen) {
      (video as any).webkitEnterFullscreen();
    }
  }, []);

  if (loading) {
    return <div className="h-[100dvh] bg-black flex items-center justify-center"><div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>;
  }

  if (!videos.length) {
    return (
      <div className="h-[100dvh] bg-black flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Play className="w-10 h-10 text-neutral-600" />
        <p className="text-neutral-400">Aucune vidéo pour le moment</p>
        <Link href="/create" className="text-red-500 font-semibold text-sm">Publier la première</Link>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory bg-black scrollbar-hide relative">
      {videos.map((video, index) => {
        const isActive = index === active;
        const author = video.profiles;
        const name = author?.username || author?.full_name || "user";
        const displayText = video.caption || "";

        return (
          <section key={video.id} data-index={index} className="relative h-[100dvh] w-full snap-start snap-always flex items-center justify-center bg-black">
            {video.url && (
              <video
                ref={(el) => { videoRefs.current[video.id] = el; }}
                src={video.url}
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

            <button onClick={() => setMuted(!muted)} className="absolute top-20 right-4 z-30 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition">
              {muted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
            </button>

            <button onClick={() => toggleFullscreen(video.id)} className="absolute top-20 right-16 z-30 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition">
              <Maximize2 className="w-4 h-4 text-white" />
            </button>

            <div className="absolute right-2 bottom-24 z-20 flex flex-col items-center gap-4">
              <div className="relative mb-2">
                <Link href={`/profile/${video.user_id}`} className="relative block w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-neutral-800">
                  {author?.avatar_url ? <img src={author.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm font-bold">{name.charAt(0).toUpperCase()}</div>}
                </Link>
              </div>

              <button type="button" onClick={(e) => { e.stopPropagation(); toggleLike(video.id); }} className="flex flex-col items-center gap-0.5 active:scale-90 transition">
                <Heart className={cn("w-9 h-9 transition-all drop-shadow-lg", liked[video.id] ? "fill-red-500 text-red-500 scale-110" : "text-white")} />
                <span className="text-xs text-white font-semibold drop-shadow-md">{formatNumber(video.like_count || 0)}</span>
              </button>

              <button type="button" onClick={(e) => { e.stopPropagation(); setCommentsOpenVideoId(video.id); }} className="flex flex-col items-center gap-0.5 active:scale-90 transition">
                <MessageCircle className="w-9 h-9 text-white drop-shadow-lg" />
                <span className="text-xs text-white font-semibold drop-shadow-md">{formatNumber(video.comment_count || 0)}</span>
              </button>

              <button type="button" onClick={(e) => { e.stopPropagation(); toggleSave(video.id); }} className="flex flex-col items-center gap-0.5 active:scale-90 transition">
                <Bookmark className={cn("w-9 h-9 transition-all drop-shadow-lg", saved[video.id] ? "fill-white text-white" : "text-white")} />
                <span className="text-xs text-white font-semibold drop-shadow-md">Enregistrer</span>
              </button>

              <button type="button" onClick={(e) => { e.stopPropagation(); handleShare(video.id, name); }} className="flex flex-col items-center gap-0.5 active:scale-90 transition">
                <Share2 className="w-8 h-8 text-white drop-shadow-lg" />
                <span className="text-xs text-white font-semibold drop-shadow-md">Partager</span>
              </button>

              <div className="w-11 h-11 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center animate-spin-slow mt-2 shadow-lg">
                <Music className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="absolute left-4 right-24 bottom-20 z-20 space-y-2">
              <Link href={`/profile/${video.user_id}`} className="font-bold text-white text-base hover:underline drop-shadow-md inline-block">@{name}</Link>
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
            setVideos((prev) => prev.map((v) => v.id === commentsOpenVideoId ? { ...v, comment_count: (v.comment_count || 0) + 1 } : v));
          }}
        />
      )}

      <style jsx>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 5s linear infinite; }
      `}</style>
    </div>
  );
}
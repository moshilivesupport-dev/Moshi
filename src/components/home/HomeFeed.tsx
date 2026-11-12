"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart, MessageCircle, Share2, Play, Music, Volume2, VolumeX,
  Bookmark, Maximize2, Search
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import FollowButton from "@/components/social/FollowButton";
import CommentsSheet from "@/components/video/CommentsSheet";

export type FeedItem = {
  id: string;
  title?: string | null;
  caption?: string | null;
  url?: string | null;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  view_count?: number | null;
  like_count?: number | null;
  comment_count?: number | null;
  created_at?: string;
  user_id: string;
  profiles?: {
    id: string;
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
  
  // 🆕 Onglet actif (Communauté | Suivis | Pour toi)
  const [activeTab, setActiveTab] = useState<"community" | "following" | "foryou">("foryou");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, [supabase]);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    
    let query = supabase
      .from("videos")
      .select(`id, url, caption, title, like_count, comment_count, view_count, user_id, profiles:user_id (username, avatar_url, full_name)`)
      .eq("is_public", true);

    if (activeTab === "following" && currentUser) {
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUser.id);
      
      const ids = (follows || []).map((f) => f.following_id);
      
      if (ids.length === 0) {
        setVideos([]);
        setLoading(false);
        return;
      }
      
      query = query.in("user_id", ids);
    }

    // "community" et "foryou" : tous les posts publics (pour l'instant on ne filtre pas par algorithme)
    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Erreur chargement vidéos:", error);
      setLoading(false);
      return;
    }

    const rows: FeedItem[] = (data || []).map((v: any) => ({
      id: v.id,
      title: v.title,
      caption: v.caption,
      url: v.url,
      view_count: v.view_count || 0,
      like_count: v.like_count || 0,
      comment_count: v.comment_count || 0,
      user_id: v.user_id,
      profiles: Array.isArray(v.profiles) ? v.profiles[0] : v.profiles,
    }));
    setVideos(rows);

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
  }, [supabase, currentUser, initialItems, activeTab]);

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

  return (
    <div className="relative h-[100dvh] w-full bg-black">
      {/* 🆕 HEADER : Onglets en haut (Capture #10) */}
      <div className="absolute top-0 left-0 right-0 z-40 pt-safe bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          {/* Onglet LIVE à gauche */}
          <button className="flex items-center gap-1 text-white">
            <div className="border-2 border-white rounded px-1.5 py-0.5 text-[10px] font-bold">LIVE</div>
          </button>

          {/* Onglets au centre */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("community")}
              className={cn(
                "text-sm font-semibold transition-colors",
                activeTab === "community" ? "text-white" : "text-white/60"
              )}
            >
              Communauté
            </button>
            <button
              onClick={() => setActiveTab("following")}
              className={cn(
                "text-sm font-semibold transition-colors",
                activeTab === "following" ? "text-white" : "text-white/60"
              )}
            >
              Suivis
            </button>
            <button
              onClick={() => setActiveTab("foryou")}
              className={cn(
                "text-sm font-semibold transition-colors relative",
                activeTab === "foryou" ? "text-white" : "text-white/60"
              )}
            >
              Pour toi
              {activeTab === "foryou" && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-white rounded-full" />
              )}
            </button>
          </div>

          {/* Icône recherche */}
          <Link href="/search" className="text-white">
            <Search className="w-6 h-6" />
          </Link>
        </div>
      </div>

      {/* FEED */}
      {loading ? (
        <div className="h-full flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      ) : videos.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
          <Play className="w-10 h-10 text-neutral-600" />
          <p className="text-neutral-400">
            {activeTab === "following" 
              ? "Suivez des créateurs pour voir leurs vidéos ici" 
              : "Aucune vidéo pour le moment"}
          </p>
          <Link href="/search" className="text-red-500 font-semibold text-sm">
            Découvrir des créateurs
          </Link>
        </div>
      ) : (
        <div ref={containerRef} className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
          {videos.map((video, index) => {
            const isActive = index === active;
            const author = video.profiles;
            const name = author?.username || author?.full_name || "user";
            const displayText = video.caption || video.title || "";

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

                {/* Bouton Mute */}
                <button onClick={() => setMuted(!muted)} className="absolute top-20 right-4 z-30 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition">
                  {muted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
                </button>

                {/* Bouton Plein écran */}
                <button onClick={() => toggleFullscreen(video.id)} className="absolute top-20 right-16 z-30 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition">
                  <Maximize2 className="w-4 h-4 text-white" />
                </button>

                {/* Actions à droite */}
                <div className="absolute right-2 bottom-24 z-20 flex flex-col items-center gap-4">
                  <div className="relative mb-2">
                    <Link href={`/profile/${video.user_id}`} className="relative block w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-neutral-800">
                      {author?.avatar_url ? <img src={author.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm font-bold">{name.charAt(0).toUpperCase()}</div>}
                    </Link>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                      <FollowButton targetUserId={video.user_id} currentUserId={currentUser?.id} variant="small" />
                    </div>
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

                {/* Description en bas */}
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
        </div>
      )}

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
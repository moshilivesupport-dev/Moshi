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
  ShoppingBag,
  ExternalLink,
  X,
  Send,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type FeedItem = {
  id: string;
  type: "video" | "live" | "product";
  title: string | null;
  description: string | null;
  media_url: string;
  thumbnail_url: string | null;
  duration?: number;
  views_count: number;
  likes_count: number;
  comments_count: number;
  price?: number;
  created_at: string;
  user_id: string;
  profiles?: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

type Comment = {
  id: string;
  created_at: string;
  content: string;
  profiles: {
    username: string | null;
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
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const el = videoRef.current;
    if (!el || item.type !== "video") return;

    if (isActive) {
      el.play().catch(() => {});
      setPlaying(true);
    } else {
      el.pause();
      el.currentTime = 0;
      setPlaying(false);
    }
  }, [isActive, item.type]);

  useEffect(() => {
    if (!showComments) return;
    async function fetchComments() {
      setLoadingComments(true);
      const { data } = await supabase
        .from(item.type === "video" ? "video_comments" : "live_comments")
        .select(`
          id, created_at, content,
          profiles:user_id (username, avatar_url)
        `)
        .eq(item.type === "video" ? "video_id" : "live_id", item.id)
        .order("created_at", { ascending: false });
      
      setComments((data as unknown as Comment[]) || []);
      setLoadingComments(false);
    }
    fetchComments();
  }, [showComments, item.id, item.type, supabase]);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const table = item.type === "video" ? "video_comments" : "live_comments";
    const foreignKey = item.type === "video" ? "video_id" : "live_id";

    const { error } = await supabase.from(table).insert({
      [foreignKey]: item.id,
      user_id: user.id,
      content: newComment.trim(),
    });

    if (!error) {
      setNewComment("");
      const { data } = await supabase
        .from(table)
        .select(`
          id, created_at, content,
          profiles:user_id (username, avatar_url)
        `)
        .eq(foreignKey, item.id)
        .order("created_at", { ascending: false });
      setComments((data as unknown as Comment[]) || []);
    }
  };

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el || item.type !== "video") return;
    if (el.paused) {
      el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const authorName = item.profiles?.full_name || item.profiles?.username || "Utilisateur";
  const profileHref = `/profil/${item.user_id}`;

  return (
    <div className="relative h-[100dvh] w-full snap-start snap-always bg-black flex items-center justify-center overflow-hidden">
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
      ) : item.type === "live" ? (
        <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
          {item.thumbnail_url && (
            <img src={item.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
          )}
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
              <Radio className="w-10 h-10 text-red-500" />
            </div>
            <span className="text-white font-bold text-lg">Live en cours</span>
            <Link href={`/live/${item.id}`} className="px-6 py-2.5 rounded-full bg-red-500 text-white font-semibold text-sm shadow-lg">
              Rejoindre le Live
            </Link>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
          {item.media_url && (
            <img src={item.media_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70 blur-xs" />
          )}
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 flex flex-col items-center gap-4 p-6 max-w-sm text-center">
            {item.thumbnail_url || item.media_url ? (
              <img src={item.thumbnail_url || item.media_url} alt="" className="w-48 h-48 rounded-2xl object-cover shadow-2xl border border-neutral-700" />
            ) : null}
            <div className="bg-black/70 backdrop-blur px-4 py-1.5 rounded-full border border-neutral-700 text-emerald-400 font-bold text-lg">
              {item.price ? `${item.price} XOF` : "Article boutique"}
            </div>
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

      {showComments && (
        <div className="absolute inset-x-0 bottom-0 top-1/3 bg-neutral-900/95 backdrop-blur-md rounded-t-3xl z-30 flex flex-col animate-in slide-in-from-bottom duration-300 border-t border-neutral-800">
          <div className="flex items-center justify-between p-4 border-b border-neutral-800">
            <h3 className="text-white font-semibold text-base">
              Commentaires ({comments.length})
            </h3>
            <button onClick={() => setShowComments(false)} className="p-1 rounded-full text-neutral-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingComments ? (
              <div className="flex justify-center p-4"><div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"/></div>
            ) : comments.length === 0 ? (
              <p className="text-center text-neutral-500 text-sm py-8">Aucun commentaire pour le moment.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-3 items-start">
                  <img src={c.profiles?.avatar_url || "/placeholder-avatar.png"} alt="" className="w-8 h-8 rounded-full object-cover bg-neutral-800" />
                  <div>
                    <div className="text-xs font-semibold text-neutral-300">@{c.profiles?.username || "Utilisateur"}</div>
                    <div className="text-sm text-white mt-0.5">{c.content}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendComment} className="p-3 border-t border-neutral-800 bg-neutral-950 flex gap-2">
            <input
              type="text"
              placeholder="Ajouter un commentaire..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500"
            />
            <button type="submit" className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
        <Link href={profileHref} onClick={(e) => e.stopPropagation()}>
          <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-neutral-800">
            {item.profiles?.avatar_url ? (
              <img src={item.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-lg font-semibold">
                {authorName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </Link>

        {item.type !== "product" && (
          <button onClick={(e) => { e.stopPropagation(); onLike(item.id); }} className="flex flex-col items-center gap-1">
            <div className={cn("w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center", liked && "text-red-500")}>
              <Heart className={cn("w-6 h-6", liked && "fill-current")} />
            </div>
            <span className="text-xs text-white font-medium">{formatNumber(item.likes_count + (liked ? 1 : 0))}</span>
          </button>
        )}

        {item.type === "product" ? (
          <Link href={`/shop/products/${item.id}`} onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
              <ExternalLink className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs text-white font-medium">Voir</span>
          </Link>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); setShowComments(true); }} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs text-white font-medium">{formatNumber(item.comments_count)}</span>
          </button>
        )}
      </div>

      <div className="absolute left-0 right-16 bottom-20 px-4 z-10">
        <Link href={profileHref} className="font-semibold text-white text-[15px] hover:underline" onClick={(e) => e.stopPropagation()}>
          @{item.profiles?.username || authorName}
        </Link>
        {item.title && <p className="text-white text-sm mt-1 font-medium line-clamp-1">{item.title}</p>}
      </div>
    </div>
  );
}

export function HomeFeed({ initialItems = [] }: HomeFeedProps) {
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
      const { data: videos } = await supabase.from("videos").select(`
        id, title, description, video_url, thumbnail_url,
        duration, views_count, likes_count, comments_count,
        created_at, user_id, profiles:user_id (id, username, full_name, avatar_url)
      `).eq("is_public", true).limit(20);

      const formattedVideos: FeedItem[] = (videos || []).map((v: any) => ({
        id: v.id, 
        type: "video" as const, 
        title: v.title, 
        description: v.description || "", // <--- Ajouté ici pour satisfaire FeedItem
        media_url: v.video_url, 
        thumbnail_url: v.thumbnail_url,
        views_count: v.views_count, 
        likes_count: v.likes_count, 
        comments_count: v.comments_count,
        created_at: v.created_at, 
        user_id: v.user_id, 
        profiles: v.profiles
      }));

      setItems(formattedVideos);
      setLoading(false);
    }
    load();
  }, [initialItems.length, supabase]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || items.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = Number(entry.target.getAttribute("data-index"));
          if (!Number.isNaN(index)) setActiveIndex(index);
        }
      });
    }, { root: container, threshold: 0.6 });
    container.querySelectorAll("[data-index]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  const handleLike = useCallback(async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const already = likedIds.has(id);
    if (already) {
      await supabase.from("video_likes").delete().eq("video_id", id).eq("user_id", user.id);
      setLikedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } else {
      await supabase.from("video_likes").insert({ video_id: id, user_id: user.id });
      setLikedIds((prev) => new Set(prev).add(id));
    }
  }, [likedIds, supabase]);

  if (loading) return <div className="h-[100dvh] w-full bg-black flex items-center justify-center"><div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"/></div>;

  return (
    <div ref={containerRef} className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
      {items.map((item, index) => (
        <div key={`${item.type}-${item.id}`} data-index={index}>
          <FeedCard item={item} isActive={index === activeIndex} onLike={handleLike} liked={likedIds.has(item.id)} />
        </div>
      ))}
    </div>
  );
}

export default HomeFeed;

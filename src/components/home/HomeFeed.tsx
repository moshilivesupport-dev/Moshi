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
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type FeedItem = {
  id: string;
  type: "video" | "live" | "product";
  title: string | null;
  description: string | null;
  media_url: string;          // video_url, stream_url ou image_url du produit
  thumbnail_url: string | null;
  duration?: number;
  views_count: number;
  likes_count: number;
  comments_count: number;
  price?: number;             // Spécifique aux produits
  created_at: string;
  user_id: string;
  profiles?: {
    id: string;
    username: string | null;
    full_name: string | null;
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

  const authorName =
    item.profiles?.full_name ||
    item.profiles?.username ||
    "Utilisateur";

  const profileHref = `/profil/${item.user_id}`;

  return (
    <div className="relative h-[100dvh] w-full snap-start snap-always bg-black flex items-center justify-center overflow-hidden">
      {/* Média selon le type (Vidéo, Live ou Produit) */}
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
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnail_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
          )}
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
              <Radio className="w-10 h-10 text-red-500" />
            </div>
            <span className="text-white font-bold text-lg">Live en cours</span>
            <Link
              href={`/live/${item.id}`}
              className="px-6 py-2.5 rounded-full bg-red-500 text-white font-semibold text-sm shadow-lg"
            >
              Rejoindre le Live
            </Link>
          </div>
        </div>
      ) : (
        // Affichage Produit / Article e-commerce dans le feed
        <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
          {item.media_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.media_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-70 blur-xs"
            />
          )}
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 flex flex-col items-center gap-4 p-6 max-w-sm text-center">
            {item.thumbnail_url || item.media_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.thumbnail_url || item.media_url}
                alt={item.title || "Produit"}
                className="w-48 h-48 rounded-2xl object-cover shadow-2xl border border-neutral-700"
              />
            ) : null}
            <div className="bg-black/70 backdrop-blur px-4 py-1.5 rounded-full border border-neutral-700 text-emerald-400 font-bold text-lg">
              {item.price ? `${item.price} XOF` : "Article boutique"}
            </div>
          </div>
        </div>
      )}

      {/* Gradient */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

      {/* Badge Type (Live ou Produit) */}
      {item.type === "live" && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-red-500 px-2.5 py-1 rounded-md text-xs font-bold text-white">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </div>
      )}
      {item.type === "product" && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-emerald-600 px-2.5 py-1 rounded-md text-xs font-bold text-white">
          <ShoppingBag className="w-3.5 h-3.5" />
          PRODUIT
        </div>
      )}

      {/* Actions droites */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
        <Link href={profileHref} onClick={(e) => e.stopPropagation()}>
          <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-neutral-800">
            {item.profiles?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.profiles.avatar_url}
                alt={authorName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-lg font-semibold">
                {authorName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </Link>

        {item.type !== "product" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike(item.id);
            }}
            className="flex flex-col items-center gap-1"
          >
            <div
              className={cn(
                "w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center",
                liked && "text-red-500"
              )}
            >
              <Heart className={cn("w-6 h-6", liked && "fill-current")} />
            </div>
            <span className="text-xs text-white font-medium">
              {formatNumber(item.likes_count + (liked ? 1 : 0))}
            </span>
          </button>
        )}

        <Link
          href={
            item.type === "video"
              ? `/videos/${item.id}`
              : item.type === "live"
              ? `/live/${item.id}`
              : `/shop/products/${item.id}`
          }
          onClick={(e) => e.stopPropagation()}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            {item.type === "product" ? (
              <ExternalLink className="w-6 h-6 text-white" />
            ) : (
              <MessageCircle className="w-6 h-6 text-white" />
            )}
          </div>
          <span className="text-xs text-white font-medium">
            {item.type === "product" ? "Voir" : formatNumber(item.comments_count)}
          </span>
        </Link>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (navigator.share) {
              navigator.share({
                title: item.title || "Noxia",
                url: window.location.origin + (item.type === "video" ? `/videos/${item.id}` : `/live/${item.id}`),
              });
            }
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs text-white font-medium">Partager</span>
        </button>
      </div>

      {/* Infos bas */}
      <div className="absolute left-0 right-16 bottom-20 px-4 z-10">
        <Link
          href={profileHref}
          className="font-semibold text-white text-[15px] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          @{item.profiles?.username || authorName}
        </Link>

        {item.title && (
          <p className="text-white text-sm mt-1 font-medium line-clamp-1">
            {item.title}
          </p>
        )}
        {item.description && (
          <p className="text-white/90 text-sm mt-1 line-clamp-2">
            {item.description}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2 text-xs text-white/70">
          {item.type !== "product" && <span>{formatNumber(item.views_count)} vues</span>}
          {item.type === "product" && (
            <Link
              href={`/shop/products/${item.id}`}
              className="inline-flex items-center gap-1 text-emerald-400 font-semibold bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Voir la boutique
            </Link>
          )}
        </div>
      </div>

      {/* Mute */}
      {item.type === "video" && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMuted((m) => !m);
            }}
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-white" />
            ) : (
              <Volume2 className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
      )}

      {!playing && isActive && item.type === "video" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomeFeed({ initialItems = [] }: HomeFeedProps) {
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

      // 1. Récupération des vidéos publiques
      const { data: videos } = await supabase
        .from("videos")
        .select(`
          id, title, description, video_url, thumbnail_url,
          duration, views_count, likes_count, comments_count,
          created_at, user_id,
          profiles:user_id (id, username, full_name, avatar_url)
        `)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(20);

      // 2. Récupération des lives en cours (si la table s'appelle 'lives' ou 'streams')
      const { data: lives } = await supabase
        .from("lives")
        .select(`
          id, title, description, stream_url, thumbnail_url,
          viewer_count, created_at, user_id,
          profiles:user_id (id, username, full_name, avatar_url)
        `)
        .eq("is_active", true)
        .limit(5);

      // 3. Récupération des produits récents des vendeurs
      const { data: products } = await supabase
        .from("products")
        .select(`
          id, name, description, image_url, price,
          created_at, user_id,
          profiles:user_id (id, username, full_name, avatar_url)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10);

      const formattedVideos: FeedItem[] = (videos || []).map((v: any) => ({
        id: v.id,
        type: "video" as const,
        title: v.title,
        description: v.description,
        media_url: v.video_url,
        thumbnail_url: v.thumbnail_url,
        duration: v.duration,
        views_count: v.views_count || 0,
        likes_count: v.likes_count || 0,
        comments_count: v.comments_count || 0,
        created_at: v.created_at,
        user_id: v.user_id,
        profiles: v.profiles,
      }));

      const formattedLives: FeedItem[] = (lives || []).map((l: any) => ({
        id: l.id,
        type: "live" as const,
        title: l.title,
        description: l.description,
        media_url: l.stream_url || "",
        thumbnail_url: l.thumbnail_url,
        views_count: l.viewer_count || 0,
        likes_count: 0,
        comments_count: 0,
        created_at: l.created_at,
        user_id: l.user_id,
        profiles: l.profiles,
      }));

      const formattedProducts: FeedItem[] = (products || []).map((p: any) => ({
        id: p.id,
        type: "product" as const,
        title: p.name,
        description: p.description,
        media_url: p.image_url,
        thumbnail_url: p.image_url,
        price: p.price,
        views_count: 0,
        likes_count: 0,
        comments_count: 0,
        created_at: p.created_at,
        user_id: p.user_id,
        profiles: p.profiles,
      }));

      // Mélange ou concaténation du feed global (Lives en premier si actifs, puis vidéos et produits)
      const combinedFeed = [...formattedLives, ...formattedVideos, ...formattedProducts].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setItems(combinedFeed);
      setLoading(false);
    }

    load();
  }, [initialItems.length, supabase]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-index"));
            if (!Number.isNaN(index)) setActiveIndex(index);
          }
        });
      },
      { root: container, threshold: 0.6 }
    );

    container.querySelectorAll("[data-index]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  const handleLike = useCallback(
    async (id: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const already = likedIds.has(id);
      if (already) {
        await supabase
          .from("video_likes")
          .delete()
          .eq("video_id", id)
          .eq("user_id", user.id);
        setLikedIds((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
      } else {
        await supabase.from("video_likes").insert({
          video_id: id,
          user_id: user.id,
        });
        setLikedIds((prev) => new Set(prev).add(id));
      }
    },
    [likedIds, supabase]
  );

  if (loading) {
    return (
      <div className="h-[100dvh] w-full bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="h-[100dvh] w-full bg-black flex flex-col items-center justify-center gap-4 text-white px-6">
        <p className="text-neutral-400 text-center">
          Aucun contenu pour le moment.
          <br />
          Publiez la première vidéo ou ajoutez un produit !
        </p>
        <Link
          href="/videos/new"
          className="px-6 py-2.5 rounded-full bg-red-500 text-sm font-medium"
        >
          Créer du contenu
        </Link>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
    >
      {items.map((item, index) => (
        <div key={`${item.type}-${item.id}`} data-index={index}>
          <FeedCard
            item={item}
            isActive={index === activeIndex}
            onLike={handleLike}
            liked={likedIds.has(item.id)}
          />
        </div>
      ))}
    </div>
  );
}

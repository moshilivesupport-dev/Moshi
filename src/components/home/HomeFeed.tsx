"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, MessageCircle, Share2, Play, Music, Volume2, VolumeX, ShoppingBag, Radio, MoreVertical, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import CommentsSheet from "@/components/video/CommentsSheet";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";

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
  product?: {
    id: string;
    title: string;
    price: number;
    currency: string | null;
    image_url: string | null;
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
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [commentsOpenVideoId, setCommentsOpenVideoId] = useState<string | null>(null);
  const [liveTokens, setLiveTokens] = useState<Record<string, string>>({});
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

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

    // 1. Vidéos
    const { data: videosData, error: videosError } = await supabase
      .from("videos")
      .select(`id, url, caption, title, like_count, comment_count, view_count, user_id, created_at, product_id`)
      .limit(20);

    if (videosError) console.error("Erreur chargement vidéos:", videosError);

    // 2. Profils
    const userIds = [...new Set((videosData || []).map(v => v.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, full_name")
      .in("id", userIds);

    const profilesMap: Record<string, any> = {};
    (profilesData || []).forEach(p => { profilesMap[p.id] = p; });

    // 3. Produits liés (✅ const au lieu de let)
    const productIds = (videosData || []).map(v => v.product_id).filter(Boolean);
    const productsMap: Record<string, any> = {};
    if (productIds.length > 0) {
      const { data: productsData } = await supabase
        .from("products")
        .select("id, title, price, currency, image_url")
        .in("id", productIds);
      (productsData || []).forEach(p => { productsMap[p.id] = p; });
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
      profiles: profilesMap[v.user_id] || null,
      product: v.product_id ? productsMap[v.product_id] : null,
    }));

    // 4. Lives
    const { data: livesData } = await supabase
      .from("live_sessions")
      .select(`id, title, room_name, host_id, created_at`)
      .eq("status", "live")
      .limit(10);

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
      profiles: profilesMap[l.host_id] || null,
      product: null,
    }));

    // 5. Mélange
    setItems(shuffleArray([...videos, ...lives]));

    // 6. Likes
    if (currentUser) {
      const { data: likesData } = await supabase.from("video_likes").select("video_id").eq("user_id", currentUser.id);
      const likedMap: Record<string, boolean> = {};
      likesData?.forEach((l: any) => { likedMap[l.video_id] = true; });
      setLiked(likedMap);
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
          if (data.token) setLiveTokens(prev => ({ ...prev, [activeItem.id]: data.token }));
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
    } catch (err) { console.error(err); }
  }, [currentUser, liked, supabase, router]);

  const handleShare = async (itemId: string, type: string, name: string) => {
    const shareUrl = `${window.location.origin}/${type === 'live' ? 'live' : 'videos'}/${itemId}`;
    if (navigator.share) {
      try { await navigator.share({ title: `Regarde sur Moshi`, url: shareUrl }); } catch {}
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert("Lien copié !");
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm("Supprimer cette vidéo ?")) return;
    try {
      const video = items.find(v => v.id === videoId);
      if (!video) return;
      await supabase.from("videos").delete().eq("id", videoId);
      if (video.url) {
        const urlParts = video.url.split("/");
        const fileName = urlParts[urlParts.length - 1];
        await supabase.storage.from("videos").remove([`${video.user_id}/${fileName}`]);
      }
      setItems(items.filter(v => v.id !== videoId));
      setMenuOpenId(null);
    } catch (err) { alert("Erreur"); }
  };

  if (loading) {
    return <div className="h-[100dvh] bg-white flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#9D7BEA] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!items.length) {
    return (
      <div className="h-[100dvh] bg-white flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#FF8FB1] to-[#60A5FA] flex items-center justify-center">
          <Play className="w-10 h-10 text-white fill-white" />
        </div>
        <p className="text-gray-500 font-semibold">Aucune vidéo pour le moment</p>
        <Button variant="gradient" onClick={() => router.push("/create")}>Publier la première</Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="moshi-feed">
      {items.map((item, index) => {
        const isActive = index === active;
        const author = item.profiles;
        const name = author?.username || author?.full_name || "user";
        const isOwner = currentUser?.id === item.user_id;

        // --- LIVE ---
        if (item.type === "live") {
          const liveToken = liveTokens[item.id];
          return (
            <section key={item.id} data-index={index} className="moshi-video relative bg-gray-900 flex items-center justify-center">
              {liveToken ? (
                <LiveKitRoom token={liveToken} serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL} connect={true} video={false} audio={false} className="absolute inset-0">
                  <VideoConference />
                  <RoomAudioRenderer />
                </LiveKitRoom>
              ) : (
                <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}

              <div className="absolute top-24 left-4 z-30">
                <div className="flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-xl px-3 py-1.5 border border-white/30 text-white">
                  <span className="w-2 h-2 rounded-full bg-[#FF8FB1] animate-pulse" />
                  <Radio size={14} />
                  <span className="text-xs font-bold">LIVE</span>
                </div>
              </div>

              <div className="absolute bottom-32 left-4 right-4 z-20 space-y-2">
                <p className="text-white font-bold text-lg">@{name}</p>
                <p className="text-white/90 text-sm line-clamp-2">{item.title}</p>
                <Link href={`/live/${item.id}`} className="inline-block mt-2">
                  <Button variant="gradient">Rejoindre le live</Button>
                </Link>
              </div>
            </section>
          );
        }

        // --- VIDÉO ---
        return (
          <section key={item.id} data-index={index} className="moshi-video relative bg-black">
            {item.url && (
              <video
                ref={(el) => { videoRefs.current[item.id] = el; }}
                src={item.url}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline loop muted={muted} autoPlay={isActive}
                onClick={(e) => {
                  const v = e.currentTarget;
                  if (v.paused) v.play(); else v.pause();
                }}
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

            {/* Header flottant avec LOGO */}
            <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between">
              <img 
                src="/moshi-logo.jpg" 
                alt="Moshi" 
                className="h-8 w-auto object-contain" 
              />
              <button onClick={() => setMuted(!muted)} className="moshi-glass w-10 h-10 rounded-full flex items-center justify-center text-white">
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </div>

            {/* Menu options */}
            {isOwner && (
              <div className="absolute top-20 right-4 z-40">
                <button onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)} className="moshi-glass w-10 h-10 rounded-full flex items-center justify-center text-white">
                  <MoreVertical size={18} />
                </button>
                {menuOpenId === item.id && (
                  <div className="absolute top-12 right-0 bg-white rounded-2xl shadow-xl overflow-hidden min-w-[140px]">
                    <button onClick={() => handleDeleteVideo(item.id)} className="flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 w-full text-left text-sm font-semibold">
                      <Trash2 size={16} /> Supprimer
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="absolute right-3 bottom-40 z-20 flex flex-col items-center gap-4">
              <Avatar src={author?.avatar_url || undefined} name={name} size={48} />
              
              <button onClick={() => toggleLike(item.id)} className="flex flex-col items-center gap-1">
                <motion.div whileTap={{ scale: 0.8 }} className="moshi-glass w-12 h-12 rounded-full flex items-center justify-center">
                  <Heart size={24} className={liked[item.id] ? "fill-[#FF8FB1] text-[#FF8FB1]" : "text-white"} />
                </motion.div>
                <span className="text-xs font-semibold text-white">{item.like_count}</span>
              </button>

              <button onClick={() => setCommentsOpenVideoId(item.id)} className="flex flex-col items-center gap-1">
                <div className="moshi-glass w-12 h-12 rounded-full flex items-center justify-center">
                  <MessageCircle size={24} className="text-white" />
                </div>
                <span className="text-xs font-semibold text-white">{item.comment_count}</span>
              </button>

              <button onClick={() => handleShare(item.id, 'video', name)} className="flex flex-col items-center gap-1">
                <div className="moshi-glass w-12 h-12 rounded-full flex items-center justify-center">
                  <Share2 size={22} className="text-white" />
                </div>
                <span className="text-xs font-semibold text-white">Partager</span>
              </button>
            </div>

            {/* Infos en bas */}
            <div className="absolute left-4 right-20 bottom-36 z-20 space-y-2">
              <p className="text-white font-bold text-base">@{name}</p>
              {item.caption && <p className="text-white/90 text-sm line-clamp-2">{item.caption}</p>}
              <div className="flex items-center gap-2">
                <Music size={12} className="text-white" />
                <p className="text-xs text-white/80">Son original - {name}</p>
              </div>
            </div>

            {/* Carte Produit */}
            {item.product && (
              <div className="absolute bottom-[72px] left-3 right-3 z-30">
                <div className="bg-white rounded-2xl p-2.5 flex items-center gap-3 shadow-xl">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt={item.product.title} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag className="w-6 h-6 text-[#9D7BEA]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-500 font-medium">Produit présenté</p>
                    <p className="text-sm font-bold text-gray-900 truncate">{item.product.title}</p>
                    <p className="text-sm font-extrabold text-[#9D7BEA]">{item.product.price} {item.product.currency}</p>
                  </div>
                  <Link href={`/shop/${item.product.id}`}>
                    <Button variant="gradient" className="px-4 py-2 text-xs">Acheter</Button>
                  </Link>
                </div>
              </div>
            )}
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
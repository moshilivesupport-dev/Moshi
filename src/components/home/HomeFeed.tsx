"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Play, ShoppingBag, ChevronRight, Radio } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { getFlag } from "@/lib/utils";

interface FeedItem {
  id: string;
  type: "video" | "live";
  url: string;
  caption: string | null;
  title?: string | null;
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

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(".0", "") + "K";
  return num.toString();
}

export default function HomeFeed() {
  const supabase = createClient();
  const containerRef = useRef<HTMLDivElement>(null);

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, [supabase]);

  const loadFeed = useCallback(async () => {
    setLoading(true);

    // 1. Lives en cours
    const { data: livesData } = await supabase
      .from("lives")
      .select("id, title, host_id")
      .eq("status", "live")
      .order("created_at", { ascending: false });

    // 2. Vidéos (on enlève le filtre status pour voir toutes les vidéos)
    const { data: videosData } = await supabase
      .from("videos")
      .select("id, url, caption, title, like_count, comment_count, user_id")
      .order("created_at", { ascending: false })
      .limit(20);

    // 3. Profils
    const allUserIds = [
      ...(livesData || []).map(l => l.host_id),
      ...(videosData || []).map(v => v.user_id)
    ];
    const uniqueUserIds = [...new Set(allUserIds)];

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, full_name, country")
      .in("id", uniqueUserIds);

    const profilesMap: Record<string, any> = {};
    (profilesData || []).forEach((p) => {
      profilesMap[p.id] = p;
    });

    // 4. Fusion (Lives d'abord, puis vidéos)
    const livesItems: FeedItem[] = (livesData || []).map((l: any) => ({
      id: l.id,
      type: "live",
      url: "",
      caption: l.title,
      title: l.title,
      like_count: 0,
      comment_count: 0,
      user_id: l.host_id,
      profiles: profilesMap[l.host_id] || null,
    }));

    const videosItems: FeedItem[] = (videosData || []).map((v: any) => ({
      id: v.id,
      type: "video",
      url: v.url,
      caption: v.caption,
      title: v.title,
      like_count: v.like_count || 0,
      comment_count: v.comment_count || 0,
      user_id: v.user_id,
      profiles: profilesMap[v.user_id] || null,
    }));

    setItems([...livesItems, ...videosItems]);

    if (currentUser) {
      const { data: likesData } = await supabase.from("video_likes").select("video_id").eq("user_id", currentUser.id);
      const likedMap: Record<string, boolean> = {};
      likesData?.forEach((l) => { likedMap[l.video_id] = true; });
      setLiked(likedMap);
    }

    setLoading(false);
  }, [supabase, currentUser]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const toggleLike = async (videoId: string) => {
    if (!currentUser) return;
    const isCurrentlyLiked = liked[videoId];
    setLiked((prev) => ({ ...prev, [videoId]: !isCurrentlyLiked }));
    setItems((prev) =>
      prev.map((v) => v.id === videoId ? { ...v, like_count: (v.like_count || 0) + (isCurrentlyLiked ? -1 : 1) } : v)
    );

    try {
      if (isCurrentlyLiked) {
        await supabase.from("video_likes").delete().eq("video_id", videoId).eq("user_id", currentUser.id);
      } else {
        await supabase.from("video_likes").insert({ video_id: videoId, user_id: currentUser.id });
      }
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return <div className="h-[100dvh] bg-black flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#9D7BEA] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (items.length === 0) {
    return (
      <div className="h-[100dvh] bg-black flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Play className="w-12 h-12 text-neutral-600" />
        <p className="text-neutral-400 font-medium">Aucune vidéo pour le moment</p>
        <Link href="/create">
          <button className="moshi-gradient text-white font-bold px-6 py-3 rounded-full">Publier la première</button>
        </Link>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="moshi-feed">
      {items.map((item) => {
        const isLiked = liked[item.id];
        const author = item.profiles;
        const authorName = author?.username || author?.full_name || "user";

        if (item.type === "live") {
          return (
            <section key={item.id} className="moshi-video relative bg-gradient-to-br from-purple-900 via-pink-900 to-black flex items-center justify-center">
              <Link href={`/live/${item.id}`} className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center mb-4 animate-pulse shadow-2xl">
                  <Radio size={40} className="text-white" />
                </div>
                <span className="bg-red-500 text-white text-sm font-bold px-4 py-1 rounded-full mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> LIVE
                </span>
                <h2 className="text-white text-2xl font-extrabold mb-2">{item.title}</h2>
                <p className="text-white/80 font-semibold">par @{authorName}</p>
                <button className="mt-6 bg-white text-black font-bold px-8 py-3 rounded-full shadow-lg">
                  Rejoindre le live
                </button>
              </Link>
            </section>
          );
        }

        return (
          <section key={item.id} className="moshi-video relative bg-black">
            <video src={item.url} className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted={muted} playsInline />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

            <button onClick={() => setMuted(!muted)} className="absolute top-20 right-4 z-30 moshi-glass w-10 h-10 rounded-full flex items-center justify-center text-white">
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            <div className="absolute right-3 bottom-32 z-20 flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white bg-neutral-800">
                {author?.avatar_url ? (
                  <Image src={author.avatar_url} alt={authorName} width={48} height={48} className="w-full h-full object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold">{authorName.charAt(0).toUpperCase()}</div>
                )}
              </div>

              <button onClick={() => toggleLike(item.id)} className="flex flex-col items-center gap-1">
                <motion.div whileTap={{ scale: 0.8 }} className="moshi-glass w-12 h-12 rounded-full flex items-center justify-center">
                  <Heart size={24} className={isLiked ? "fill-[#FF8FB1] text-[#FF8FB1]" : "text-white"} />
                </motion.div>
                <span className="text-xs font-semibold text-white">{formatNumber(item.like_count + (isLiked ? 1 : 0))}</span>
              </button>

              <button className="flex flex-col items-center gap-1">
                <div className="moshi-glass w-12 h-12 rounded-full flex items-center justify-center"><MessageCircle size={24} className="text-white" /></div>
                <span className="text-xs font-semibold text-white">{formatNumber(item.comment_count)}</span>
              </button>

              <button className="flex flex-col items-center gap-1">
                <div className="moshi-glass w-12 h-12 rounded-full flex items-center justify-center"><Share2 size={22} className="text-white" /></div>
              </button>
            </div>

            <div className="absolute left-4 right-20 bottom-32 z-20 space-y-2">
              <Link href={`/profile/${item.user_id}`} className="text-white font-bold text-base hover:underline">
                @{authorName} {author?.country && getFlag(author.country)}
              </Link>
              {(item.caption || item.title) && <p className="text-white/90 text-sm line-clamp-2">{item.caption || item.title}</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
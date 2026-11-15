"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Play, ShoppingBag, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

interface FeedItem {
  id: string;
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

  const [videos, setVideos] = useState<FeedItem[]>([]);
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

  const loadVideos = useCallback(async () => {
    setLoading(true);

    // 1. Charger les vidéos depuis Supabase
    const { data: videosData, error } = await supabase
      .from("videos")
      .select("id, url, caption, title, like_count, comment_count, user_id")
      .eq("status", "published") // Assure-toi que tes vidéos ont le statut 'published' sur Supabase
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Erreur chargement vidéos:", error);
      setLoading(false);
      return;
    }

    // 2. Charger les profils
    const userIds = [...new Set((videosData || []).map((v) => v.user_id))];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, full_name")
      .in("id", userIds);

    const profilesMap: Record<string, any> = {};
    (profilesData || []).forEach((p) => {
      profilesMap[p.id] = p;
    });

    // 3. Fusionner
    const items: FeedItem[] = (videosData || []).map((v: any) => ({
      id: v.id,
      url: v.url,
      caption: v.caption,
      title: v.title,
      like_count: v.like_count || 0,
      comment_count: v.comment_count || 0,
      user_id: v.user_id,
      profiles: profilesMap[v.user_id] || null,
    }));

    setVideos(items);

    // 4. Charger les likes
    if (currentUser) {
      const { data: likesData } = await supabase
        .from("video_likes")
        .select("video_id")
        .eq("user_id", currentUser.id);
      const likedMap: Record<string, boolean> = {};
      likesData?.forEach((l) => {
        likedMap[l.video_id] = true;
      });
      setLiked(likedMap);
    }

    setLoading(false);
  }, [supabase, currentUser]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  if (loading) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#9D7BEA] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="h-[100dvh] bg-black flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Play className="w-12 h-12 text-neutral-600" />
        <p className="text-neutral-400 font-medium">Aucune vidéo pour le moment</p>
        <Link href="/create">
          <button className="moshi-gradient text-white font-bold px-6 py-3 rounded-full">
            Publier la première
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="moshi-feed">
      {videos.map((video) => {
        const isLiked = liked[video.id];
        const author = video.profiles;
        const authorName = author?.username || author?.full_name || "user";

        return (
          <section key={video.id} className="moshi-video relative bg-black">
            
            {/* LA VIDÉO SUPABASE */}
            <video
              src={video.url}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              loop
              muted={muted}
              playsInline
            />

            {/* Overlay sombre */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

            {/* BOUTON MUTE (Taille réduite) */}
            <button
              onClick={() => setMuted(!muted)}
              className="absolute bottom-[160px] right-3 z-30 w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-lg"
            >
              {muted ? <VolumeX size={16} className="text-gray-900" /> : <Volume2 size={16} className="text-gray-900" />}
            </button>

            {/* ACTIONS À DROITE (Taille réduite) */}
            <div className="absolute right-3 bottom-[220px] z-20 flex flex-col items-center gap-4">
              
              {/* Avatar */}
              <div className="relative mb-1">
                <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white bg-neutral-800 shadow-md">
                  {author?.avatar_url ? (
                    <Image src={author.avatar_url} alt={authorName} width={44} height={44} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">{authorName.charAt(0).toUpperCase()}</div>
                  )}
                </div>
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-[#FF4B72] rounded-full flex items-center justify-center text-white text-xs font-bold border border-black">
                  +
                </div>
              </div>

              {/* Like */}
              <button onClick={() => setLiked(p => ({...p, [video.id]: !p[video.id]}))} className="flex flex-col items-center gap-1">
                <div className="w-[42px] h-[42px] rounded-full bg-white flex items-center justify-center shadow-md">
                  <Heart size={20} className={isLiked ? "fill-[#FF8FB1] text-[#FF8FB1]" : "text-gray-900"} />
                </div>
                <span className="text-[11px] font-semibold text-white drop-shadow-md">
                  {formatNumber(video.like_count + (isLiked ? 1 : 0))}
                </span>
              </button>

              {/* Commentaires */}
              <button className="flex flex-col items-center gap-1">
                <div className="w-[42px] h-[42px] rounded-full bg-white flex items-center justify-center shadow-md">
                  <MessageCircle size={20} className="text-gray-900" />
                </div>
                <span className="text-[11px] font-semibold text-white drop-shadow-md">
                  {formatNumber(video.comment_count)}
                </span>
              </button>

              {/* Partager */}
              <button className="flex flex-col items-center gap-1">
                <div className="w-[42px] h-[42px] rounded-full bg-white flex items-center justify-center shadow-md">
                  <Share2 size={20} className="text-gray-900" />
                </div>
                <span className="text-[11px] font-semibold text-white drop-shadow-md">Partager</span>
              </button>
            </div>

            {/* INFOS EN BAS À GAUCHE */}
            <div className="absolute left-3 right-20 bottom-[170px] z-20 space-y-2">
              <div className="flex items-center gap-2">
                <Link href={`/profile/${video.user_id}`} className="text-white font-bold text-[15px] drop-shadow-md">
                  @{authorName}
                </Link>
                <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">✓</span>
                
                <button className="ml-1 px-3 py-1 rounded-full border border-white/50 bg-black/20 backdrop-blur-sm text-white text-[11px] font-semibold">
                  Suivre
                </button>
              </div>
              
              {(video.caption || video.title) && (
                <p className="text-white text-[13px] font-medium leading-snug drop-shadow-md whitespace-pre-line">
                  {video.caption || video.title}
                </p>
              )}
            </div>

            {/* CARTE PRODUIT (Taille réduite, en attendant la vraie table produits) */}
            <div className="absolute bottom-[85px] left-3 right-3 z-30">
              <div className="bg-white/95 backdrop-blur-md rounded-[20px] p-2 flex items-center gap-3 shadow-xl">
                <div className="w-12 h-12 rounded-xl bg-gray-200 flex-shrink-0 overflow-hidden">
                   {/* Image générique en attendant la connexion produits */}
                   <div className="w-full h-full flex items-center justify-center text-gray-400"><ShoppingBag size={20}/></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-gray-900 truncate">Produit Moshi</p>
                  <p className="text-[14px] font-extrabold text-[#9D7BEA]">Voir la boutique</p>
                </div>
                <Link href="/shop">
                  <button className="moshi-gradient text-white px-4 py-2 rounded-full text-[13px] font-bold flex items-center gap-1.5 shadow-md">
                    <ShoppingBag size={14} /> Acheter
                  </button>
                </Link>
                <ChevronRight size={18} className="text-gray-400 mr-1" />
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
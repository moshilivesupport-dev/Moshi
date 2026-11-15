"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle, Share2, Music, Volume2, VolumeX, Play } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

interface FeedItem {
  id: string;
  url: string;
  caption: string | null;
  title: string | null;
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

    // 1. Charger les vidéos
    const { data: videosData, error } = await supabase
      .from("videos")
      .select("id, url, caption, title, like_count, comment_count, user_id")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Erreur chargement vidéos:", error);
      setLoading(false);
      return;
    }

    // 2. Charger les profils séparément
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

    // 4. Charger les likes de l'utilisateur
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

  const toggleLike = async (videoId: string) => {
    if (!currentUser) return;
    const isCurrentlyLiked = liked[videoId];
    setLiked((prev) => ({ ...prev, [videoId]: !isCurrentlyLiked }));
    setVideos((prev) =>
      prev.map((v) =>
        v.id === videoId
          ? { ...v, like_count: (v.like_count || 0) + (isCurrentlyLiked ? -1 : 1) }
          : v
      )
    );

    try {
      if (isCurrentlyLiked) {
        await supabase
          .from("video_likes")
          .delete()
          .eq("video_id", videoId)
          .eq("user_id", currentUser.id);
      } else {
        await supabase
          .from("video_likes")
          .insert({ video_id: videoId, user_id: currentUser.id });
      }
    } catch (err) {
      console.error("Erreur like:", err);
    }
  };

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
        const authorAvatar = author?.avatar_url;

        return (
          <section key={video.id} className="moshi-video relative bg-black">
            {/* Vidéo */}
            <video
              src={video.url}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              loop
              muted={muted}
              playsInline
            />

            {/* Overlay dégradé */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

            {/* Bouton Mute */}
            <button
              onClick={() => setMuted(!muted)}
              className="absolute top-20 right-4 z-30 moshi-glass w-10 h-10 rounded-full flex items-center justify-center text-white"
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            {/* Actions à droite */}
            <div className="absolute right-3 bottom-32 z-20 flex flex-col items-center gap-4">
              {/* Avatar */}
              <div className="relative">
                <Link href={`/profile/${video.user_id}`}>
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white bg-neutral-800">
                    {authorAvatar ? (
                      <Image
                        src={authorAvatar}
                        alt={authorName}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold">
                        {authorName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </Link>
              </div>

              {/* Like */}
              <button
                onClick={() => toggleLike(video.id)}
                className="flex flex-col items-center gap-1"
              >
                <motion.div
                  whileTap={{ scale: 0.8 }}
                  className="moshi-glass w-12 h-12 rounded-full flex items-center justify-center"
                >
                  <Heart
                    size={24}
                    className={isLiked ? "fill-[#FF8FB1] text-[#FF8FB1]" : "text-white"}
                  />
                </motion.div>
                <span className="text-xs font-semibold text-white">
                  {formatNumber(video.like_count + (isLiked ? 1 : 0))}
                </span>
              </button>

              {/* Commentaires */}
              <button className="flex flex-col items-center gap-1">
                <div className="moshi-glass w-12 h-12 rounded-full flex items-center justify-center">
                  <MessageCircle size={24} className="text-white" />
                </div>
                <span className="text-xs font-semibold text-white">
                  {formatNumber(video.comment_count)}
                </span>
              </button>

              {/* Partager */}
              <button className="flex flex-col items-center gap-1">
                <div className="moshi-glass w-12 h-12 rounded-full flex items-center justify-center">
                  <Share2 size={22} className="text-white" />
                </div>
                <span className="text-xs font-semibold text-white">Partager</span>
              </button>

              {/* Musique */}
              <div className="w-12 h-12 rounded-full bg-black/50 border border-white/20 flex items-center justify-center mt-2">
                <Music size={20} className="text-white" />
              </div>
            </div>

            {/* Infos en bas à gauche */}
            <div className="absolute left-4 right-20 bottom-24 z-20 space-y-2">
              <Link href={`/profile/${video.user_id}`} className="text-white font-bold text-base hover:underline">
                @{authorName}
              </Link>
              {(video.caption || video.title) && (
                <p className="text-white/90 text-sm line-clamp-2">
                  {video.caption || video.title}
                </p>
              )}
              <div className="flex items-center gap-2">
                <Music size={12} className="text-white" />
                <p className="text-xs text-white/80">Son original - {authorName}</p>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
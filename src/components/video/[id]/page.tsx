"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Heart, MessageCircle, Share2, Volume2, VolumeX, Play } from "lucide-react";
import CommentsSheet from "@/components/video/CommentsSheet";
import { cn } from "@/lib/utils";

interface Video {
  id: string;
  url: string;
  caption: string | null;
  title: string | null;
  like_count: number;
  comment_count: number;
  user_id: string;
  profiles: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(".0", "") + "K";
  return num.toString();
}

export default function VideoDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data: videoData } = await supabase
        .from("videos")
        .select("id, url, caption, title, like_count, comment_count, user_id")
        .eq("id", id)
        .single();

      if (videoData) {
        const { data: profile } = await supabase.from("profiles").select("username, full_name, avatar_url").eq("id", videoData.user_id).single();
        setVideo({ ...videoData, profiles: profile });
        setLikeCount(videoData.like_count || 0);

        if (user) {
          const { data: likeData } = await supabase.from("video_likes").select("video_id").eq("video_id", id).eq("user_id", user.id).maybeSingle();
          if (likeData) setIsLiked(true);
        }
      }
      setLoading(false);
    };
    if (id) load();
  }, [id, supabase]);

  const toggleLike = async () => {
    if (!currentUser || !video) return;
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount(likeCount + (newIsLiked ? 1 : -1));

    if (newIsLiked) {
      await supabase.from("video_likes").insert({ video_id: video.id, user_id: currentUser.id });
    } else {
      await supabase.from("video_likes").delete().eq("video_id", video.id).eq("user_id", currentUser.id);
    }
  };

  if (loading) return <div className="min-h-[100dvh] bg-black flex items-center justify-center"><div className="w-10 h-10 border-4 border-moshi-purple border-t-transparent rounded-full animate-spin" /></div>;
  if (!video) return <div className="min-h-[100dvh] bg-black flex items-center justify-center text-white">Vidéo introuvable</div>;

  const authorName = video.profiles?.username || video.profiles?.full_name || "user";

  return (
    <div className="h-[100dvh] w-full bg-black relative overflow-hidden">
      
      {/* HEADER */}
      <header className="absolute top-0 left-0 right-0 z-30 p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white pointer-events-auto">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </header>

      {/* VIDEO */}
      <video src={video.url} className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted={muted} playsInline />

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

      {/* ACTIONS DROITE */}
      <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-5">
        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white bg-neutral-800 mb-2">
           {video.profiles?.avatar_url ? (
             <Image src={video.profiles.avatar_url} alt={authorName} width={48} height={48} className="w-full h-full object-cover" unoptimized />
           ) : (
             <div className="w-full h-full flex items-center justify-center text-white font-bold">{authorName.charAt(0).toUpperCase()}</div>
           )}
        </div>

        <button onClick={toggleLike} className="flex flex-col items-center gap-1">
          <div className="w-[46px] h-[46px] rounded-full bg-white flex items-center justify-center shadow-md">
            <Heart size={22} className={isLiked ? "fill-[#FF8FB1] text-[#FF8FB1]" : "text-gray-900"} />
          </div>
          <span className="text-xs font-semibold text-white drop-shadow-md">{formatNumber(likeCount)}</span>
        </button>

        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <div className="w-[46px] h-[46px] rounded-full bg-white flex items-center justify-center shadow-md">
            <MessageCircle size={22} className="text-gray-900" />
          </div>
          <span className="text-xs font-semibold text-white drop-shadow-md">{formatNumber(video.comment_count)}</span>
        </button>

        <button className="flex flex-col items-center gap-1">
          <div className="w-[46px] h-[46px] rounded-full bg-white flex items-center justify-center shadow-md">
            <Share2 size={22} className="text-gray-900" />
          </div>
          <span className="text-xs font-semibold text-white drop-shadow-md">Partager</span>
        </button>
      </div>

      {/* MUTE */}
      <button onClick={() => setMuted(!muted)} className="absolute bottom-24 left-4 z-30 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      {/* INFOS AUTEUR */}
      <div className="absolute left-4 right-20 bottom-10 z-20 space-y-2">
        <p className="text-white font-bold text-base">@{authorName}</p>
        {(video.caption || video.title) && (
          <p className="text-white/90 text-sm leading-snug">{video.caption || video.title}</p>
        )}
      </div>

      {/* MODALE COMMENTAIRES */}
      {showComments && (
        <CommentsSheet videoId={video.id} onClose={() => setShowComments(false)} />
      )}
    </div>
  );
}
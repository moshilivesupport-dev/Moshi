"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Heart, MessageCircle, Share2, Music, Volume2, VolumeX, Play
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import CommentsSheet from "./CommentsSheet";

interface VideoDetailProps {
  video: any; // La vidéo passée depuis le serveur
  currentUser: any;
}

export default function VideoDetail({ video, currentUser }: VideoDetailProps) {
  const router = useRouter();
  const supabase = createClient();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(video.like_count || 0);
  const [showComments, setShowComments] = useState(false);

  const author = Array.isArray(video.profiles) ? video.profiles[0] : video.profiles;

  // Vérifier si l'utilisateur a déjà liké
  useEffect(() => {
    if (!currentUser) return;
    const checkLike = async () => {
      const { data } = await supabase
        .from("video_likes")
        .select("id")
        .eq("video_id", video.id)
        .eq("user_id", currentUser.id)
        .single();
      setLiked(!!data);
    };
    checkLike();
  }, [currentUser, video.id, supabase]);

  const toggleLike = async () => {
    if (!currentUser) { router.push("/auth/login"); return; }
    const isLiked = liked;
    setLiked(!isLiked);
    setLikeCount((c: number) => c + (isLiked ? -1 : 1));

    try {
      if (isLiked) {
        await supabase.from("video_likes").delete().eq("video_id", video.id).eq("user_id", currentUser.id);
      } else {
        await supabase.from("video_likes").insert({ video_id: video.id, user_id: currentUser.id });
      }
    } catch {}
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/videos/${video.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Regarde sur Moshi", url: shareUrl }); } catch {}
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert("Lien copié !");
    }
  };

  const name = author?.username || author?.full_name || "user";

  return (
    <div className="h-[100dvh] w-full bg-black relative overflow-hidden">
      {/* Bouton retour */}
      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 z-30 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center"
      >
        <ArrowLeft className="w-6 h-6 text-white" />
      </button>

      {/* Bouton mute */}
      <button
        onClick={() => setMuted(!muted)}
        className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center"
      >
        {muted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
      </button>

      {/* LA VIDÉO */}
      {video.url && (
        <video
          ref={videoRef}
          src={video.url}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          loop
          playsInline
          muted={muted}
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            if (v.paused) v.play();
            else v.pause();
          }}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

      {/* Actions à droite */}
      <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-5">
        <Link href={`/profile/${video.user_id}`} className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-neutral-800">
          {author?.avatar_url ? (
            <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>

        <button onClick={toggleLike} className="flex flex-col items-center gap-1">
          <Heart className={cn("w-9 h-9 drop-shadow-lg transition", liked ? "fill-red-500 text-red-500" : "text-white")} />
          <span className="text-xs text-white font-semibold">{formatNumber(likeCount)}</span>
        </button>

        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <MessageCircle className="w-9 h-9 text-white drop-shadow-lg" />
          <span className="text-xs text-white font-semibold">{formatNumber(video.comment_count || 0)}</span>
        </button>

        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <Share2 className="w-8 h-8 text-white drop-shadow-lg" />
          <span className="text-xs text-white font-semibold">Partager</span>
        </button>

        <div className="w-11 h-11 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center mt-2">
          <Music className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Infos en bas */}
      <div className="absolute left-4 right-20 bottom-8 z-20 space-y-2">
        <Link href={`/profile/${video.user_id}`} className="font-bold text-white text-base hover:underline">
          @{name}
        </Link>
        {(video.caption || video.title) && (
          <p className="text-sm text-white/90 line-clamp-3">{video.caption || video.title}</p>
        )}
        <div className="flex items-center gap-2">
          <Music className="w-3.5 h-3.5 text-white" />
          <p className="text-xs text-white/80 truncate">Son original - {name}</p>
        </div>
      </div>

      {showComments && (
        <CommentsSheet
          videoId={video.id}
          isOpen={true}
          onClose={() => setShowComments(false)}
          currentUser={currentUser}
          onCommentAdded={() => {}}
        />
      )}
    </div>
  );
}
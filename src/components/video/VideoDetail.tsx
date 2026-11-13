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
  videoId: string;
}

export default function VideoDetail({ videoId }: VideoDetailProps) {
  const router = useRouter();
  const supabase = createClient();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [video, setVideo] = useState<any>(null);
  const [author, setAuthor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Charger la vidéo
      const { data: videoData, error } = await supabase
        .from("videos")
        .select(`
          id, url, caption, title, like_count, comment_count, view_count, user_id,
          profiles:user_id (username, full_name, avatar_url)
        `)
        .eq("id", videoId)
        .single();

      if (error || !videoData) {
        setLoading(false);
        return;
      }

      const authorData = Array.isArray(videoData.profiles) ? videoData.profiles[0] : videoData.profiles;
      setVideo(videoData);
      setAuthor(authorData);
      setLikeCount(videoData.like_count || 0);

      // Vérifier si déjà liké
      if (user) {
        const { data: likeData } = await supabase
          .from("video_likes")
          .select("id")
          .eq("video_id", videoId)
          .eq("user_id", user.id)
          .single();
        setLiked(!!likeData);
      }

      setLoading(false);
    };

    load();
  }, [videoId, supabase]);

  const toggleLike = async () => {
    if (!currentUser) { router.push("/auth/login"); return; }
    const isLiked = liked;
    setLiked(!isLiked);
    setLikeCount((c) => c + (isLiked ? -1 : 1));

    try {
      if (isLiked) {
        await supabase.from("video_likes").delete().eq("video_id", videoId).eq("user_id", currentUser.id);
      } else {
        await supabase.from("video_likes").insert({ video_id: videoId, user_id: currentUser.id });
      }
    } catch {}
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/videos/${videoId}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Regarde sur Moshi", url: shareUrl }); } catch {}
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert("Lien copié !");
    }
  };

  if (loading) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="h-[100dvh] bg-black flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Play className="w-12 h-12 text-neutral-700" />
        <p className="text-white font-semibold">Vidéo introuvable</p>
        <button onClick={() => router.back()} className="mt-4 px-6 py-2 bg-white text-black rounded-full font-semibold text-sm">
          Retour
        </button>
      </div>
    );
  }

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

      {/* ✅ LA VIDÉO PLEIN ÉCRAN */}
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

      {/* Dégradé pour lisibilité */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

      {/* Actions à droite */}
      <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-5">
        {/* Avatar */}
        <Link href={`/profile/${video.user_id}`} className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-neutral-800">
          {author?.avatar_url ? (
            <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>

        {/* Like */}
        <button onClick={toggleLike} className="flex flex-col items-center gap-1">
          <Heart className={cn("w-9 h-9 drop-shadow-lg transition", liked ? "fill-red-500 text-red-500" : "text-white")} />
          <span className="text-xs text-white font-semibold">{formatNumber(likeCount)}</span>
        </button>

        {/* Commentaires */}
        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <MessageCircle className="w-9 h-9 text-white drop-shadow-lg" />
          <span className="text-xs text-white font-semibold">{formatNumber(video.comment_count || 0)}</span>
        </button>

        {/* Partage */}
        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <Share2 className="w-8 h-8 text-white drop-shadow-lg" />
          <span className="text-xs text-white font-semibold">Partager</span>
        </button>

        {/* Disque de musique (animation) */}
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

      {/* Modal de commentaires */}
      {showComments && (
        <CommentsSheet
          videoId={videoId}
          isOpen={true}
          onClose={() => setShowComments(false)}
          currentUser={currentUser}
          onCommentAdded={() => {}}
        />
      )}
    </div>
  );
}
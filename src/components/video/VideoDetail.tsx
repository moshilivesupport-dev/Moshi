"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft, Heart, MessageCircle, Share2, Music, UserPlus } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import VideoPlayer from "./VideoPlayer";
import CommentsSheet from "./CommentsSheet";

interface VideoDetailProps {
  video: any;
  currentUser: any;
}

export default function VideoDetail({ video, currentUser }: VideoDetailProps) {
  const supabase = createClient();
  const router = useRouter();
  const author = video.profiles;
  const name = author?.username || author?.full_name || "user";

  const [muted, setMuted] = useState(false);
  const [liked, setLiked] = useState(false);
  // ✅ CORRECTION : Typage explicite de number pour éviter l'erreur TypeScript
  const [likesCount, setLikesCount] = useState<number>(video.likes_count || video.like_count || 0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [following, setFollowing] = useState(false);

  const toggleLike = async () => {
    if (!currentUser) {
      router.push("/auth/login");
      return;
    }

    const newLiked = !liked;
    setLiked(newLiked);
    // ✅ CORRECTION : Typage explicite de 'prev' en number
    setLikesCount((prev: number) => prev + (newLiked ? 1 : -1));

    // TODO: Persister via RPC Supabase
  };

  const toggleFollow = async () => {
    if (!currentUser) {
      router.push("/auth/login");
      return;
    }

    setFollowing(!following);
    // TODO: Persister via RPC Supabase
  };

  const share = async () => {
    const shareData = {
      title: `Vidéo de @${name}`,
      text: video.description || video.caption || "Regarde cette vidéo sur Moshi !",
      url: typeof window !== "undefined" ? window.location.href : "",
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // L'utilisateur a annulé
      }
    } else {
      // Fallback : copier le lien
      if (typeof navigator !== "undefined") {
        await navigator.clipboard.writeText(shareData.url);
        alert("Lien copié !");
      }
    }
  };

  return (
    <div className="relative h-[100dvh] w-full bg-black overflow-hidden">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
      </header>

      {/* Player vidéo */}
      <VideoPlayer
        src={video.url || video.media_url}
        poster={video.thumbnail_url}
        isActive={true}
        muted={muted}
        onMuteToggle={() => setMuted((m) => !m)}
      />

      {/* Dégradé */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

      {/* Actions droite */}
      <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-5">
        {/* Avatar + follow */}
        <div className="relative">
          <Link
            href={`/profile/${video.user_id}`}
            className="relative w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-neutral-800"
          >
            {author?.avatar_url ? (
              <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </Link>
          {!following && video.user_id !== currentUser?.id && (
            <button
              onClick={toggleFollow}
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center border-2 border-black active:scale-90 transition"
            >
              <UserPlus className="w-3 h-3 text-white" />
            </button>
          )}
        </div>

        {/* Like */}
        <button
          onClick={toggleLike}
          className="flex flex-col items-center gap-1 active:scale-90 transition"
        >
          <Heart
            className={cn(
              "w-8 h-8 transition-all",
              liked ? "fill-red-500 text-red-500 scale-110" : "text-white"
            )}
          />
          <span className="text-xs text-white font-semibold">{formatNumber(likesCount)}</span>
        </button>

        {/* Commentaires */}
        <button
          onClick={() => setCommentsOpen(true)}
          className="flex flex-col items-center gap-1 active:scale-90 transition"
        >
          <MessageCircle className="w-8 h-8 text-white" />
          <span className="text-xs text-white font-semibold">
            {formatNumber(video.comments_count || 0)}
          </span>
        </button>

        {/* Partager */}
        <button
          onClick={share}
          className="flex flex-col items-center gap-1 active:scale-90 transition"
        >
          <Share2 className="w-7 h-7 text-white" />
          <span className="text-xs text-white font-semibold">Partager</span>
        </button>

        {/* Son (disque qui tourne) */}
        <div className="w-10 h-10 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center animate-spin-slow">
          <Music className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Infos bas gauche */}
      <div className="absolute left-3 right-20 bottom-24 z-20">
        <Link
          href={`/profile/${video.user_id}`}
          className="font-semibold text-white text-[15px] hover:underline"
        >
          @{name}
        </Link>
        {(video.description || video.caption || video.title) && (
          <p className="mt-1 text-sm text-white/90 line-clamp-3">
            {video.description || video.caption || video.title}
          </p>
        )}
      </div>

      {/* Panneau de commentaires */}
      <CommentsSheet
        videoId={video.id}
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        currentUser={currentUser}
      />

      {/* Style pour l'animation du disque */}
      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 5s linear infinite;
        }
      `}</style>
    </div>
  );
}

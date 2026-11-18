
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft, Heart, MessageCircle, Share2, Volume2, VolumeX,
  Eye, Bookmark, Download
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CommentsSheet from "@/components/video/CommentsSheet";

export default function VideoDetailPage() {
  const { id } = useParams();
  const videoId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const supabase = createClient();

  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showComments, setShowComments] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadCommentCount = useCallback(async () => {
    if (!videoId) return;

    const { count, error } = await supabase
      .from("video_comments")
      .select("id", { count: "exact", head: true })
      .eq("video_id", videoId);

    if (!error && count !== null) setCommentCount(count);
  }, [supabase, videoId]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      setCurrentUser(user);

      const { data: videoData, error } = await supabase
        .from("videos")
        .select("id, url, caption, like_count, comment_count, view_count, user_id, allow_download")
        .eq("id", videoId)
        .single();

      if (error || !videoData) {
        if (active) setLoading(false);
        return;
      }

      if (!active) return;

      setVideo(videoData);
      setLikeCount(videoData.like_count || 0);
      setViewCount(videoData.view_count || 0);
      setCommentCount(videoData.comment_count || 0);

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url")
        .eq("id", videoData.user_id)
        .maybeSingle();

      if (!active) return;
      setVideo((previous: any) => ({ ...previous, profiles: profile }));

      if (user) {
        const [likeResult, saveResult, viewResult] = await Promise.all([
          supabase.from("video_likes").select("video_id")
            .eq("video_id", videoId).eq("user_id", user.id).maybeSingle(),
          supabase.from("video_saves").select("video_id")
            .eq("video_id", videoId).eq("user_id", user.id).maybeSingle(),
          supabase.from("video_views").select("id")
            .eq("video_id", videoId).eq("viewer_id", user.id).maybeSingle(),
        ]);

        if (!active) return;
        setIsLiked(!!likeResult.data);
        setIsSaved(!!saveResult.data);

        if (!viewResult.data) {
          const { error: viewError } = await supabase
            .from("video_views")
            .insert({ video_id: videoId, viewer_id: user.id });

          if (!viewError) {
            await supabase.rpc("increment_video_view", { vid_id: videoId });
            if (active) setViewCount((value) => value + 1);
          }
        }
      }

      if (active) setLoading(false);
    };

    if (videoId) void load();

    return () => { active = false; };
  }, [videoId, supabase]);

  const toggleLike = async () => {
    if (!currentUser || !video || actionLoading) return;

    setActionLoading(true);
    const previous = isLiked;
    setIsLiked(!previous);
    setLikeCount((count) => Math.max(0, count + (previous ? -1 : 1)));

    const result = previous
      ? await supabase.from("video_likes").delete()
          .eq("video_id", video.id).eq("user_id", currentUser.id)
      : await supabase.from("video_likes").insert({
          video_id: video.id, user_id: currentUser.id
        });

    if (result.error) {
      setIsLiked(previous);
      setLikeCount((count) => Math.max(0, count + (previous ? 1 : -1)));
    }
    setActionLoading(false);
  };

  const toggleSave = async () => {
    if (!currentUser || !video || actionLoading) return;

    setActionLoading(true);
    const previous = isSaved;
    setIsSaved(!previous);

    const result = previous
      ? await supabase.from("video_saves").delete()
          .eq("video_id", video.id).eq("user_id", currentUser.id)
      : await supabase.from("video_saves").insert({
          video_id: video.id, user_id: currentUser.id
        });

    if (result.error) {
      setIsSaved(previous);
      alert("Impossible de modifier les vidéos enregistrées.");
    }
    setActionLoading(false);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Regarde cette vidéo sur Moshi",
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Lien copié !");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        alert("Impossible de partager cette vidéo.");
      }
    }
  };

  const handleDownload = async () => {
    if (!video?.allow_download) return;

    try {
      const response = await fetch(video.url);
      if (!response.ok) throw new Error("Téléchargement impossible");

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `moshi-video-${video.id}.mp4`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(video.url, "_blank", "noopener,noreferrer");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-moshi-purple border-t-transparent" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-black text-white">
        Vidéo introuvable
      </div>
    );
  }

  const authorName =
    video.profiles?.username || video.profiles?.full_name || "user";

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <header className="pointer-events-none absolute left-0 right-0 top-0 z-30 bg-gradient-to-b from-black/60 to-transparent p-4">
        <button
          onClick={() => router.back()}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white"
          aria-label="Retour"
        >
          <ArrowLeft />
        </button>
      </header>

      <video
        src={video.url}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay loop muted={muted} playsInline
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

      <div className="absolute bottom-24 right-3 z-20 flex flex-col items-center gap-5">
        <div className="mb-2 h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-neutral-800">
          {video.profiles?.avatar_url ? (
            <Image
              src={video.profiles.avatar_url}
              alt={authorName}
              width={48}
              height={48}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-bold text-white">
              {authorName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <button onClick={toggleLike} className="flex flex-col items-center gap-1">
          <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white">
            <Heart size={22} className={isLiked ? "fill-[#FF8FB1] text-[#FF8FB1]" : "text-gray-900"} />
          </div>
          <span className="text-xs font-semibold text-white">{likeCount}</span>
        </button>

        <button
          onClick={() => {
            setShowComments(true);
            void loadCommentCount();
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white">
            <MessageCircle size={22} className="text-gray-900" />
          </div>
          <span className="text-xs font-semibold text-white">{commentCount}</span>
        </button>

        <button onClick={toggleSave} className="flex flex-col items-center gap-1">
          <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white">
            <Bookmark size={22} className={isSaved ? "fill-moshi-purple text-moshi-purple" : "text-gray-900"} />
          </div>
          <span className="text-xs font-semibold text-white">
            {isSaved ? "Enregistrée" : "Enregistrer"}
          </span>
        </button>

        {video.allow_download && (
          <button onClick={handleDownload} className="flex flex-col items-center gap-1">
            <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white">
              <Download size={22} className="text-gray-900" />
            </div>
            <span className="text-xs font-semibold text-white">Télécharger</span>
          </button>
        )}

        <button onClick={() => void handleShare()} className="flex flex-col items-center gap-1">
          <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white">
            <Share2 size={22} className="text-gray-900" />
          </div>
          <span className="text-xs font-semibold text-white">Partager</span>
        </button>
      </div>

      <button
        onClick={() => setMuted((value) => !value)}
        className="absolute bottom-24 left-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white"
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      <div className="absolute bottom-10 left-4 right-20 z-20 space-y-2">
        <p className="text-base font-bold text-white">@{authorName}</p>
        {video.caption && (
          <p className="text-sm leading-snug text-white/90">{video.caption}</p>
        )}
        <div className="flex items-center gap-1 pt-2 text-xs text-white/80">
          <Eye size={14} /> {viewCount} vues
        </div>
      </div>

      {showComments && (
        <CommentsSheet
          videoId={video.id}
          onClose={() => {
            setShowComments(false);
            void loadCommentCount();
          }}
        />
      )}
    </div>
  );
}

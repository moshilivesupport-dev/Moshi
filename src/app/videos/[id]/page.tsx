
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Share2,
  Volume2,
  VolumeX,
  Eye,
  Bookmark,
  Download,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CommentsSheet from "@/components/video/CommentsSheet";

type Profile = {
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type Video = {
  id: string;
  url: string;
  caption: string | null;
  like_count: number;
  comment_count: number;
  view_count: number;
  user_id: string;
  status: string;
  allow_download: boolean;
  profiles?: Profile | null;
};

export default function VideoDetailPage() {
  const params = useParams();
  const id = params?.id;
  const videoId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [pageError, setPageError] = useState("");

  const playbackUrl = videoId
    ? `/api/videos/${encodeURIComponent(videoId)}`
    : "";

  const downloadUrl = videoId
    ? `/api/videos/${encodeURIComponent(videoId)}?download=1`
    : "";

  const loadCommentCount = useCallback(async () => {
    if (!videoId) return;

    const { count, error } = await supabase
      .from("video_comments")
      .select("id", { count: "exact", head: true })
      .eq("video_id", videoId);

    if (!error && count !== null) {
      setCommentCount(count);
    }
  }, [supabase, videoId]);

  const loadVideo = useCallback(async () => {
    if (!videoId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      setCurrentUser(user ? { id: user.id } : null);

      const { data: videoData, error: videoError } = await supabase
        .from("videos")
        .select(
          "id, url, caption, like_count, comment_count, view_count, user_id, status, allow_download"
        )
        .eq("id", videoId)
        .in("status", ["published", "hidden"])
        .maybeSingle();

      if (videoError) throw videoError;

      if (!videoData) {
        setVideo(null);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url")
        .eq("id", videoData.user_id)
        .maybeSingle();

      if (profileError) {
        console.warn("Profil vidéo indisponible :", profileError.message);
      }

      const loadedVideo: Video = {
        ...videoData,
        // Ne jamais exposer directement l'URL de stockage au lecteur.
        url: playbackUrl,
        profiles: profile ?? null,
      };

      setVideo(loadedVideo);
      setLikeCount(videoData.like_count ?? 0);
      setViewCount(videoData.view_count ?? 0);
      setCommentCount(videoData.comment_count ?? 0);

      if (user) {
        const [likeResult, saveResult] = await Promise.all([
          supabase
            .from("video_likes")
            .select("video_id")
            .eq("video_id", videoId)
            .eq("user_id", user.id)
            .maybeSingle(),

          supabase
            .from("video_saves")
            .select("video_id")
            .eq("video_id", videoId)
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);

        if (likeResult.error) {
          console.warn(
            "Vérification du J'aime impossible :",
            likeResult.error.message
          );
        }

        if (saveResult.error) {
          console.warn(
            "Vérification de l'enregistrement impossible :",
            saveResult.error.message
          );
        }

        setIsLiked(!!likeResult.data);
        setIsSaved(!!saveResult.data);

        if (videoData.status === "published") {
          const { error: rpcError } = await supabase.rpc(
            "increment_video_view",
            { vid_id: videoId }
          );

          if (rpcError) {
            console.warn(
              "Comptabilisation de la vue impossible :",
              rpcError.message
            );
          } else {
            const { data: updatedVideo, error: countError } = await supabase
              .from("videos")
              .select("view_count")
              .eq("id", videoId)
              .maybeSingle();

            if (!countError && updatedVideo) {
              setViewCount(updatedVideo.view_count ?? 0);
              setVideo((current) =>
                current
                  ? {
                      ...current,
                      view_count: updatedVideo.view_count ?? 0,
                    }
                  : current
              );
            }
          }
        }
      } else {
        setIsLiked(false);
        setIsSaved(false);
      }
    } catch (error) {
      console.error("Erreur de chargement vidéo :", error);
      setPageError("Impossible de charger cette vidéo. Réessaie.");
    } finally {
      setLoading(false);
    }
  }, [supabase, videoId, playbackUrl]);

  useEffect(() => {
    void loadVideo();
  }, [loadVideo]);

  const toggleLike = async () => {
    if (!currentUser) {
      alert("Connecte-toi pour aimer cette vidéo.");
      return;
    }

    if (!video || actionLoading) return;

    setActionLoading(true);

    const previous = isLiked;

    setIsLiked(!previous);
    setLikeCount((count) =>
      Math.max(0, count + (previous ? -1 : 1))
    );

    try {
      const result = previous
        ? await supabase
            .from("video_likes")
            .delete()
            .eq("video_id", video.id)
            .eq("user_id", currentUser.id)
        : await supabase.from("video_likes").insert({
            video_id: video.id,
            user_id: currentUser.id,
          });

      if (result.error) throw result.error;
    } catch (error) {
      console.error("Erreur J'aime :", error);
      setIsLiked(previous);
      setLikeCount((count) =>
        Math.max(0, count + (previous ? 1 : -1))
      );
      alert("Impossible de modifier ton J'aime.");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSave = async () => {
    if (!currentUser) {
      alert("Connecte-toi pour enregistrer cette vidéo.");
      return;
    }

    if (!video || actionLoading) return;

    setActionLoading(true);

    const previous = isSaved;
    setIsSaved(!previous);

    try {
      const result = previous
        ? await supabase
            .from("video_saves")
            .delete()
            .eq("video_id", video.id)
            .eq("user_id", currentUser.id)
        : await supabase.from("video_saves").insert({
            video_id: video.id,
            user_id: currentUser.id,
          });

      if (result.error) throw result.error;
    } catch (error) {
      console.error("Erreur enregistrement :", error);
      setIsSaved(previous);
      alert("Impossible de modifier les vidéos enregistrées.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl = window.location.href;

      if (navigator.share) {
        await navigator.share({
          title: "Regarde cette vidéo sur Moshi",
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Lien copié !");
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        alert("Impossible de partager cette vidéo.");
      }
    }
  };

  const handleDownload = async () => {
    if (!video?.allow_download) {
      alert("Le téléchargement de cette vidéo est désactivé.");
      return;
    }

    if (downloadLoading) return;

    setDownloadLoading(true);

    try {
      const response = await fetch(downloadUrl, {
        method: "GET",
        cache: "no-store",
      });

      if (response.status === 403) {
        throw new Error(
          "Le créateur a désactivé le téléchargement de cette vidéo."
        );
      }

      if (!response.ok) {
        throw new Error("Téléchargement impossible.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = `moshi-video-${video.id}.mp4`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
    } catch (error) {
      console.error("Erreur téléchargement :", error);
      alert(
        error instanceof Error
          ? error.message
          : "Impossible de télécharger cette vidéo."
      );
    } finally {
      setDownloadLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-black">
        <Loader2 className="h-10 w-10 animate-spin text-white" />
      </div>
    );
  }

  if (!video || pageError) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
        <p>{pageError || "Vidéo introuvable ou indisponible."}</p>

        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full bg-white px-5 py-2 font-semibold text-black"
        >
          Retour
        </button>

        {pageError && (
          <button
            type="button"
            onClick={() => void loadVideo()}
            className="text-sm text-white/70 underline"
          >
            Réessayer
          </button>
        )}
      </div>
    );
  }

  const authorName =
    video.profiles?.username ||
    video.profiles?.full_name ||
    "Utilisateur";

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <header className="pointer-events-none absolute left-0 right-0 top-0 z-30 bg-gradient-to-b from-black/60 to-transparent p-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white"
          aria-label="Retour"
        >
          <ArrowLeft />
        </button>
      </header>

      <video
        src={playbackUrl}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        loop
        muted={muted}
        playsInline
        controls={false}
        onError={() => setPageError("Cette vidéo ne peut pas être lue.")}
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

        <button
          type="button"
          onClick={() => void toggleLike()}
          disabled={actionLoading}
          className="flex flex-col items-center gap-1"
          aria-label="Aimer la vidéo"
        >
          <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white">
            <Heart
              size={22}
              className={
                isLiked
                  ? "fill-[#FF8FB1] text-[#FF8FB1]"
                  : "text-gray-900"
              }
            />
          </div>
          <span className="text-xs font-semibold text-white">
            {likeCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setShowComments(true)}
          className="flex flex-col items-center gap-1"
          aria-label="Voir les commentaires"
        >
          <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white">
            <MessageCircle size={22} className="text-gray-900" />
          </div>
          <span className="text-xs font-semibold text-white">
            {commentCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => void toggleSave()}
          disabled={actionLoading}
          className="flex flex-col items-center gap-1"
          aria-label="Enregistrer la vidéo"
        >
          <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white">
            <Bookmark
              size={22}
              className={
                isSaved
                  ? "fill-moshi-purple text-moshi-purple"
                  : "text-gray-900"
              }
            />
          </div>
          <span className="text-xs font-semibold text-white">
            {isSaved ? "Enregistrée" : "Enregistrer"}
          </span>
        </button>

        {video.allow_download && (
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={downloadLoading}
            className="flex flex-col items-center gap-1 disabled:opacity-60"
            aria-label="Télécharger la vidéo"
          >
            <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white">
              {downloadLoading ? (
                <Loader2 size={22} className="animate-spin text-gray-900" />
              ) : (
                <Download size={22} className="text-gray-900" />
              )}
            </div>
            <span className="text-xs font-semibold text-white">
              Télécharger
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => void handleShare()}
          className="flex flex-col items-center gap-1"
          aria-label="Partager la vidéo"
        >
          <div className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white">
            <Share2 size={22} className="text-gray-900" />
          </div>
          <span className="text-xs font-semibold text-white">
            Partager
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={() => setMuted((value) => !value)}
        className="absolute bottom-24 left-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white"
        aria-label={muted ? "Activer le son" : "Couper le son"}
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      <div className="absolute bottom-10 left-4 right-20 z-20 space-y-2">
        <p className="text-base font-bold text-white">@{authorName}</p>

        {video.caption && (
          <p className="text-sm leading-snug text-white/90">
            {video.caption}
          </p>
        )}

        <div className="flex items-center gap-1 pt-2 text-xs text-white/80">
          <Eye size={14} />
          {viewCount} vues
        </div>
      </div>

      {showComments && (
        <CommentsSheet
          videoId={video.id}
          onCommentAdded={() => {
            void loadCommentCount();
          }}
          onClose={() => {
            setShowComments(false);
            void loadCommentCount();
          }}
        />
      )}
    </div>
  );
}

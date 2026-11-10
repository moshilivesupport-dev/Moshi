"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatNumber } from "@/lib/utils";
import {
  Heart,
  MessageCircle,
  Share2,
  Send,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: Profile | null;
};

type Video = {
  id: string;
  title: string | null;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration: number;
  views_count: number;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_id: string;
  profiles: Profile | null;
};

interface Props {
  video: Video;
  initialComments: Comment[];
}

export default function VideoDetailClient({
  video,
  initialComments,
}: Props) {
  const supabase = createClient();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(video.likes_count);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, [supabase]);

  // Vérifier si déjà liké
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("video_likes")
      .select("id")
      .eq("video_id", video.id)
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setLiked(true);
      });
  }, [userId, video.id, supabase]);

  const toggleLike = async () => {
    if (!userId) return;

    if (liked) {
      await supabase
        .from("video_likes")
        .delete()
        .eq("video_id", video.id)
        .eq("user_id", userId);
      setLiked(false);
      setLikesCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("video_likes").insert({
        video_id: video.id,
        user_id: userId,
      });
      setLiked(true);
      setLikesCount((c) => c + 1);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !commentText.trim() || submitting) return;

    setSubmitting(true);
    const content = commentText.trim();

    const { data, error } = await supabase
      .from("video_comments")
      .insert({
        video_id: video.id,
        user_id: userId,
        content,
      })
      .select(
        `
        id,
        content,
        created_at,
        user_id,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `
      )
      .single();

    if (!error && data) {
      setComments((prev) => [...prev, data as unknown as Comment]);
      setCommentText("");
    }

    setSubmitting(false);
  };

  const authorName =
    video.profiles?.full_name ||
    video.profiles?.username ||
    "Utilisateur";

  return (
    <div className="flex flex-col flex-1">
      {/* Lecteur vidéo */}
      <div className="relative w-full aspect-[9/16] max-h-[55vh] bg-black">
        <video
          ref={videoRef}
          src={video.video_url}
          poster={video.thumbnail_url || undefined}
          controls={false}
          playsInline
          autoPlay
          loop
          muted={muted}
          className="w-full h-full object-contain"
        />

        <button
          onClick={() => setMuted((m) => !m)}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
        >
          {muted ? (
            <VolumeX className="w-4 h-4 text-white" />
          ) : (
            <Volume2 className="w-4 h-4 text-white" />
          )}
        </button>
      </div>

      {/* Infos + actions */}
      <div className="px-4 py-3 border-b border-neutral-800">
        <div className="flex items-start gap-3">
          <Link href={`/profil/${video.user_id}`}>
            <div className="w-11 h-11 rounded-full overflow-hidden bg-neutral-800 shrink-0">
              {video.profiles?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.profiles.avatar_url}
                  alt={authorName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-semibold">
                  {authorName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </Link>

          <div className="flex-1 min-w-0">
            <Link
              href={`/profil/${video.user_id}`}
              className="font-semibold text-sm hover:underline"
            >
              @{video.profiles?.username || authorName}
            </Link>
            {video.title && (
              <p className="text-sm mt-0.5 font-medium">{video.title}</p>
            )}
            {video.description && (
              <p className="text-sm text-neutral-300 mt-1">
                {video.description}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-5 mt-4">
          <button
            onClick={toggleLike}
            className="flex items-center gap-1.5 text-sm"
          >
            <Heart
              className={cn(
                "w-5 h-5",
                liked && "fill-red-500 text-red-500"
              )}
            />
            <span>{formatNumber(likesCount)}</span>
          </button>

          <div className="flex items-center gap-1.5 text-sm text-neutral-400">
            <MessageCircle className="w-5 h-5" />
            <span>{formatNumber(comments.length)}</span>
          </div>

          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: video.title || "Vidéo Moshi",
                  url: window.location.href,
                });
              }
            }}
            className="flex items-center gap-1.5 text-sm text-neutral-400 ml-auto"
          >
            <Share2 className="w-5 h-5" />
            Partager
          </button>
        </div>
      </div>

      {/* Liste des commentaires */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {comments.length === 0 ? (
          <p className="text-center text-neutral-500 text-sm py-8">
            Aucun commentaire pour le moment
          </p>
        ) : (
          comments.map((c) => {
            const name =
              c.profiles?.full_name ||
              c.profiles?.username ||
              "Utilisateur";
            return (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-800 shrink-0">
                  {c.profiles?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.profiles.avatar_url}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-semibold">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold mr-2">
                      @{c.profiles?.username || name}
                    </span>
                    {c.content}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {new Date(c.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input commentaire */}
      <form
        onSubmit={submitComment}
        className="sticky bottom-0 border-t border-neutral-800 bg-black px-3 py-2.5 flex items-center gap-2"
      >
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder={
            userId ? "Ajouter un commentaire..." : "Connectez-vous pour commenter"
          }
          disabled={!userId || submitting}
          maxLength={500}
          className="flex-1 bg-neutral-900 border border-neutral-700 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-red-500/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!userId || !commentText.trim() || submitting}
          className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center disabled:opacity-40 disabled:bg-neutral-700 transition"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </form>
    </div>
  );
}

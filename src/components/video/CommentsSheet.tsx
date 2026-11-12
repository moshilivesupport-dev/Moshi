"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Send } from "lucide-react";

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    username: string | null;
    avatar_url: string | null;
  } | null;
};

interface CommentsSheetProps {
  videoId: string;
  isOpen?: boolean;
  onClose: () => void;
  currentUser: { id: string } | null;
  onCommentAdded?: () => void;
  onCountChange?: (delta: number) => void;
}

export default function CommentsSheet({
  videoId,
  isOpen = true,
  onClose,
  currentUser,
  onCommentAdded,
  onCountChange,
}: CommentsSheetProps) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    (async () => {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("video_comments")
        .select(
          `id, content, created_at, user_id, profiles:user_id ( username, avatar_url )`
        )
        .eq("video_id", videoId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (err) {
        setError(err.message);
        setComments([]);
      } else {
        setComments(
          (data || []).map((c) => {
            const row = c as Comment & {
              profiles?: Comment["profiles"] | Comment["profiles"][];
            };
            return {
              ...row,
              profiles: Array.isArray(row.profiles)
                ? row.profiles[0]
                : row.profiles,
            };
          })
        );
      }

      setLoading(false);
    })();
  }, [supabase, videoId, isOpen]);

  if (!isOpen) return null;

  const sendComment = async () => {
    if (!currentUser) return;
    const content = newComment.trim();
    if (!content || sending) return;

    setSending(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("video_comments")
      .insert({
        video_id: videoId,
        user_id: currentUser.id,
        content,
      })
      .select(
        `id, content, created_at, user_id, profiles:user_id ( username, avatar_url )`
      )
      .single();

    setSending(false);

    if (err) {
      setError(err.message);
      return;
    }

    const row = data as Comment & {
      profiles?: Comment["profiles"] | Comment["profiles"][];
    };
    const normalized: Comment = {
      ...row,
      profiles: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles,
    };

    setComments((prev) => [...prev, normalized]);
    setNewComment("");
    onCommentAdded?.();
    onCountChange?.(1);
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-label="Fermer"
      />
      <div className="relative w-full max-w-lg bg-neutral-950 rounded-t-3xl border-t border-neutral-800 max-h-[70dvh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <p className="text-sm font-semibold text-white">
            {comments.length} commentaire{comments.length > 1 ? "s" : ""}
          </p>
          <button type="button" onClick={onClose} className="p-2">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading ? (
            <p className="text-sm text-neutral-500 text-center py-8">
              Chargement...
            </p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-8">
              Sois le premier a commenter
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-800 shrink-0">
                  {comment.profiles?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={comment.profiles.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="
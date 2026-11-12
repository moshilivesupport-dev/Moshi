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
  currentUser: { id: string } | null;
  onClose: () => void;
  onCountChange?: (delta: number) => void;
}

export default function CommentsSheet({
  videoId,
  currentUser,
  onClose,
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
    (async () => {
      setLoading(true);
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
      } else {
        setComments(
          (data || []).map((c: any) => ({
            ...c,
            profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles,
          }))
        );
      }
      setLoading(false);
    })();
  }, [supabase, videoId]);

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

    const row = {
      ...data,
      profiles: Array.isArray((data as any).profiles)
        ? (data as any).profiles[0]
        : (data as any).profiles,
    } as Comment;

    setComments((prev) => [...prev, row]);
    setNewComment("");
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
            <p className="text-sm text-neutral-500 text-center py-8">Chargement...</p>
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
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                      {(comment.profiles?.username || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-neutral-400 font-semibold">
                    {comment.profiles?.username || "user"}
                  </p>
                  <p className="text-sm text-white break-words">{comment.content}</p>
                </div>
              </div>
            ))
          )}
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        </div>

        {currentUser ? (
          <div className="p-3 border-t border-neutral-800 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void sendComment();
              }}
              placeholder="Ajouter un commentaire..."
              className="flex-1 bg-neutral-800 text-white px-4 py-2.5 rounded-full text-sm outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              type="button"
              onClick={() => void sendComment()}
              disabled={!newComment.trim() || sending}
              className="w-10 h-10 rounded-full bg-red-500 disabled:bg-neutral-700 flex items-center justify-center"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-neutral-500 py-4">
            Connecte-toi pour commenter
          </p>
        )}
      </div>
    </div>
  );
}
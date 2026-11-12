"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Send } from "lucide-react";

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: { username: string | null; avatar_url: string | null } | null;
};

interface Props {
  videoId: string;
  isOpen?: boolean;
  onClose: () => void;
  currentUser: { id: string } | null;
  onCommentAdded?: () => void;
}

export default function CommentsSheet({
  videoId,
  isOpen = true,
  onClose,
  currentUser,
  onCommentAdded,
}: Props) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from("video_comments")
        .select("id, content, created_at, user_id, profiles:user_id(username, avatar_url)")
        .eq("video_id", videoId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (err) setError(err.message);
      else {
        setComments(
          (data || []).map((c: any) => ({
            ...c,
            profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles,
          }))
        );
      }
      setLoading(false);
    })();
  }, [isOpen, videoId, supabase]);

  if (!isOpen) return null;

  const send = async () => {
    if (!currentUser || !text.trim() || sending) return;
    setSending(true);
    setError(null);

    const { data, error: err } = await supabase
      .from("video_comments")
      .insert({
        video_id: videoId,
        user_id: currentUser.id,
        content: text.trim(),
      })
      .select("id, content, created_at, user_id, profiles:user_id(username, avatar_url)")
      .single();

    setSending(false);
    if (err) {
      setError(err.message);
      return;
    }

    const row: any = data;
    setComments((prev) => [
      ...prev,
      {
        ...row,
        profiles: Array.isArray(row.profiles) ? row.profiles[0] : row.profiles,
      },
    ]);
    setText("");
    onCommentAdded?.();
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center">
      <button type="button" className="absolute inset-0 bg-black/60" onClick={onClose} />
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
          {loading && (
            <p className="text-sm text-neutral-500 text-center py-8">Chargement...</p>
          )}
          {!loading && comments.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-8">
              Sois le premier a commenter
            </p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-800 shrink-0">
                {c.profiles?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                    {(c.profiles?.username || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-neutral-400 font-semibold">
                  {c.profiles?.username || "user"}
                </p>
                <p className="text-sm text-white break-words">{c.content}</p>
              </div>
            </div>
          ))}
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        </div>

        {currentUser ? (
          <div className="p-3 border-t border-neutral-800 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void send();
              }}
              placeholder="Ajouter un commentaire..."
              className="flex-1 bg-neutral-800 text-white px-4 py-2.5 rounded-full text-sm outline-none focus:ring-2 focus:ring-red-500"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={!text.trim() || sending}
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
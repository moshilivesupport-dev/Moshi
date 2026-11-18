
"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { X, Send, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface CommentsSheetProps {
  videoId: string;
  onClose: () => void;
}

export default function CommentsSheet({
  videoId,
  onClose,
}: CommentsSheetProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<Comment["profiles"]>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const supabase = createClient();

  const loadComments = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setCurrentUser(user);

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      setUserProfile(profile ?? null);
    }

    const { data, error } = await supabase
      .from("video_comments")
      .select("id, content, created_at, user_id")
      .eq("video_id", videoId)
      .order("created_at", { ascending: true });

    if (error) {
      setErrorMessage("Impossible de charger les commentaires.");
      setLoading(false);
      return;
    }

    const rows = data ?? [];
    const userIds = [...new Set(rows.map((comment) => comment.user_id))];

    let profilesMap: Record<string, Comment["profiles"]> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", userIds);

      for (const profile of profiles ?? []) {
        profilesMap[profile.id] = profile;
      }
    }

    setComments(
      rows.map((comment) => ({
        ...comment,
        profiles: profilesMap[comment.user_id] ?? null,
      }))
    );

    setLoading(false);
  }, [supabase, videoId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const handleSend = async () => {
    const content = newComment.trim();

    if (!content || !currentUser || sending || content.length > 500) {
      return;
    }

    setSending(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("video_comments")
      .insert({
        video_id: videoId,
        user_id: currentUser.id,
        content,
      })
      .select("id, content, created_at, user_id")
      .single();

    if (error || !data) {
      setErrorMessage(
        error?.message ?? "Impossible d'envoyer le commentaire."
      );
      setSending(false);
      return;
    }

    setComments((previous) => [
      ...previous,
      {
        ...data,
        profiles: userProfile,
      },
    ]);

    setNewComment("");
    setSending(false);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Fermer les commentaires"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60"
      />

      <section className="fixed bottom-0 left-0 right-0 z-50 flex h-[75dvh] flex-col rounded-t-3xl bg-white">
        <header className="flex items-center justify-between border-b border-gray-100 p-4">
          <div className="w-10" />
          <h2 className="font-bold text-moshi-text">
            {comments.length} commentaires
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-10 w-10 items-center justify-center"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-moshi-purple" />
            </div>
          ) : errorMessage ? (
            <p className="py-8 text-center text-sm text-red-500">
              {errorMessage}
            </p>
          ) : comments.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">
              Sois le premier à commenter !
            </p>
          ) : (
            comments.map((comment) => {
              const name =
                comment.profiles?.username ||
                comment.profiles?.full_name ||
                "Utilisateur";

              return (
                <div key={comment.id} className="flex gap-3">
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-100">
                    {comment.profiles?.avatar_url ? (
                      <Image
                        src={comment.profiles.avatar_url}
                        alt={name}
                        width={36}
                        height={36}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-bold text-moshi-purple">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-500">
                      @{name}
                    </p>
                    <p className="mt-0.5 break-words text-sm leading-snug text-moshi-text">
                      {comment.content}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <footer className="border-t border-gray-100 bg-white p-3 pb-safe">
          {!currentUser ? (
            <p className="text-center text-sm text-gray-500">
              Connecte-toi pour commenter.
            </p>
          ) : (
            <>
              {errorMessage && (
                <p className="mb-2 text-xs text-red-500">
                  {errorMessage}
                </p>
              )}

              <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
                <input
                  type="text"
                  maxLength={500}
                  placeholder="Ajouter un commentaire..."
                  value={newComment}
                  onChange={(event) => setNewComment(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void handleSend();
                  }}
                  className="flex-1 bg-transparent text-sm outline-none"
                />

                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending || !newComment.trim()}
                  aria-label="Envoyer le commentaire"
                  className="p-1 text-moshi-purple disabled:opacity-40"
                >
                  {sending ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>

              <p className="mt-1 text-right text-[10px] text-gray-400">
                {newComment.length}/500
              </p>
            </>
          )}
        </footer>
      </section>
    </>
  );
}

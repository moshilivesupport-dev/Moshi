
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { X, Send, Loader2, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface CommentProfile {
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: CommentProfile | null;
}

interface CommentsSheetProps {
  videoId: string;
  onClose: () => void;
  onCommentAdded?: (videoId: string) => void;
}

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = String(error.message);

    if (
      message.toLowerCase().includes("row-level security") ||
      message.toLowerCase().includes("policy")
    ) {
      return "Supabase refuse l'envoi du commentaire. Vérifie les autorisations de commentaires.";
    }

    if (
      message.toLowerCase().includes("jwt") ||
      message.toLowerCase().includes("token")
    ) {
      return "Ta session a expiré. Reconnecte-toi pour commenter.";
    }

    if (
      message.toLowerCase().includes("foreign key") ||
      message.toLowerCase().includes("violates")
    ) {
      return "Ton compte ou cette vidéo n'est pas correctement associé. Réessaie après reconnexion.";
    }

    return message;
  }

  return "Une erreur inattendue est survenue. Réessaie.";
}

export default function CommentsSheet({
  videoId,
  onClose,
  onCommentAdded,
}: CommentsSheetProps) {
  const supabase = useMemo(() => createClient(), []);
  const callbackRef = useRef(onCommentAdded);
  const knownCommentIds = useRef<Set<string>>(new Set());
  const sendingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(
    null
  );
  const [userProfile, setUserProfile] = useState<CommentProfile | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    callbackRef.current = onCommentAdded;
  }, [onCommentAdded]);

  const sortComments = useCallback((list: Comment[]) => {
    return [...list].sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    );
  }, []);

  const loadComments = useCallback(
    async (signal: { cancelled: boolean }) => {
      setLoading(true);
      setErrorMessage("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (signal.cancelled) return;

        setCurrentUser(user ? { id: user.id } : null);
        setAuthReady(true);

        let ownProfile: CommentProfile | null = null;

        if (user) {
          const { data, error } = await supabase
            .from("profiles")
            .select("username, full_name, avatar_url")
            .eq("id", user.id)
            .maybeSingle();

          if (error) throw error;

          ownProfile = data ?? null;
        }

        if (signal.cancelled) return;
        setUserProfile(ownProfile);

        const { data, error } = await supabase
          .from("video_comments")
          .select("id, content, created_at, user_id")
          .eq("video_id", videoId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (signal.cancelled) return;

        const rows = data ?? [];
        const userIds = [...new Set(rows.map((row) => row.user_id))];
        const profilesMap: Record<string, CommentProfile> = {};

        if (userIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url")
            .in("id", userIds);

          if (profilesError) throw profilesError;
          if (signal.cancelled) return;

          for (const profile of profiles ?? []) {
            profilesMap[profile.id] = {
              username: profile.username,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
            };
          }
        }

        if (signal.cancelled) return;

        const loaded: Comment[] = rows.map((row) => ({
          ...row,
          profiles: profilesMap[row.user_id] ?? null,
        }));

        knownCommentIds.current = new Set(
          loaded.map((comment) => comment.id)
        );

        setComments(loaded);
      } catch (error) {
        if (signal.cancelled) return;

        console.error("Chargement des commentaires :", error);
        setErrorMessage(getErrorMessage(error));
        setAuthReady(true);
      } finally {
        if (!signal.cancelled) setLoading(false);
      }
    },
    [supabase, videoId]
  );

  useEffect(() => {
    const signal = { cancelled: false };

    void loadComments(signal);

    return () => {
      signal.cancelled = true;
    };
  }, [loadComments]);

  // Synchronisation en temps réel.
  useEffect(() => {
    if (!authReady) return;

    let active = true;

    const channel = supabase
      .channel(`comments-${videoId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "video_comments",
          filter: `video_id=eq.${videoId}`,
        },
        async (payload) => {
          const row = payload.new as {
            id: string;
            content: string;
            created_at: string;
            user_id: string;
          };

          if (!active || knownCommentIds.current.has(row.id)) return;

          knownCommentIds.current.add(row.id);

          const { data: profile } = await supabase
            .from("profiles")
            .select("username, full_name, avatar_url")
            .eq("id", row.user_id)
            .maybeSingle();

          if (!active) return;

          const item: Comment = {
            id: row.id,
            content: row.content,
            created_at: row.created_at,
            user_id: row.user_id,
            profiles: profile ?? null,
          };

          setComments((previous) => {
            if (previous.some((comment) => comment.id === item.id)) {
              return previous;
            }

            return sortComments([...previous, item]);
          });

          if (row.user_id !== currentUser?.id) {
            callbackRef.current?.(videoId);
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("Realtime commentaires indisponible :", status);
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase, videoId, currentUser?.id, authReady, sortComments]);

  const handleSend = async () => {
    const content = newComment.trim();

    if (!content || content.length > 500 || sendingRef.current) return;

    setErrorMessage("");

    if (!currentUser) {
      setErrorMessage("Connecte-toi pour publier un commentaire.");
      return;
    }

    sendingRef.current = true;
    setSending(true);

    try {
      // Vérifier la session avant l'insertion.
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user || user.id !== currentUser.id) {
        setCurrentUser(user ? { id: user.id } : null);
        throw new Error("Ta session a expiré. Reconnecte-toi.");
      }

      const { data, error } = await supabase
        .from("video_comments")
        .insert({
          video_id: videoId,
          user_id: user.id,
          content,
        })
        .select("id, content, created_at, user_id")
        .single();

      if (error) throw error;

      const item: Comment = {
        ...data,
        profiles: userProfile,
      };

      const isNew = !knownCommentIds.current.has(item.id);
      knownCommentIds.current.add(item.id);

      setComments((previous) => {
        if (previous.some((comment) => comment.id === item.id)) {
          return previous;
        }

        return sortComments([...previous, item]);
      });

      setNewComment("");

      if (isNew) {
        callbackRef.current?.(videoId);
      }
    } catch (error) {
      console.error("Erreur détaillée envoi commentaire :", error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      sendingRef.current = false;
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const formatDate = (date: string) => {
    const value = new Date(date);
    const difference = Math.max(0, Date.now() - value.getTime());

    const minutes = Math.floor(difference / 60000);
    const hours = Math.floor(difference / 3600000);
    const days = Math.floor(difference / 86400000);

    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `${minutes} min`;
    if (hours < 24) return `${hours} h`;
    if (days < 7) return `${days} j`;

    return value.toLocaleDateString("fr-FR");
  };

  return (
    <>
      <button
        type="button"
        aria-label="Fermer les commentaires"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Commentaires"
        className="fixed bottom-0 left-0 right-0 z-50 flex h-[75dvh] flex-col rounded-t-3xl bg-white"
      >
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
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-gray-400">
              <MessageCircle size={32} />
              <p className="text-center text-sm">
                Sois le premier à commenter !
              </p>
            </div>
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
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-bold text-gray-600">
                        @{name}
                      </p>

                      <span className="text-[10px] text-gray-400">
                        {formatDate(comment.created_at)}
                      </span>
                    </div>

                    <p className="mt-1 break-words text-sm leading-snug text-moshi-text">
                      {comment.content}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <footer className="border-t border-gray-100 bg-white p-3 pb-safe">
          {errorMessage && (
            <div className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600 break-words">
              {errorMessage}
            </div>
          )}

          {!authReady ? (
            <div className="flex justify-center py-2">
              <Loader2
                className="animate-spin text-moshi-purple"
                size={18}
              />
            </div>
          ) : !currentUser ? (
            <p className="text-center text-sm text-gray-500">
              Connecte-toi pour commenter.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
                <input
                  ref={inputRef}
                  type="text"
                  maxLength={500}
                  placeholder="Ajouter un commentaire..."
                  value={newComment}
                  disabled={sending}
                  onChange={(event) => setNewComment(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none disabled:opacity-50"
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

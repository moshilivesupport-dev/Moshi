
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  X,
  Send,
  Loader2,
  MessageCircle,
  Heart,
  Mic,
  Square,
  Trash2,
  Play,
  CornerUpLeft,
} from "lucide-react";
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
  parent_comment_id: string | null;
  voice_url: string | null;
  profiles: CommentProfile | null;
}

interface CommentsSheetProps {
  videoId: string;
  onClose: () => void;
  onCommentAdded?: (videoId: string) => void;
}

interface CommentLike {
  comment_id: string;
  user_id: string;
}

function errorText(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = String(error.message);

    if (/row-level security|policy/i.test(message)) {
      return "Tu n'as pas l'autorisation de publier ce commentaire.";
    }

    if (/jwt|token/i.test(message)) {
      return "Ta session a expiré. Reconnecte-toi.";
    }

    return message;
  }

  return "Une erreur est survenue. Réessaie.";
}

function formatDate(date: string) {
  const difference = Math.max(
    0,
    Date.now() - new Date(date).getTime()
  );

  const minutes = Math.floor(difference / 60000);
  const hours = Math.floor(difference / 3600000);
  const days = Math.floor(difference / 86400000);

  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `${minutes} min`;
  if (hours < 24) return `${hours} h`;
  if (days < 7) return `${days} j`;

  return new Date(date).toLocaleDateString("fr-FR");
}

export default function CommentsSheet({
  videoId,
  onClose,
  onCommentAdded,
}: CommentsSheetProps) {
  const supabase = useMemo(() => createClient(), []);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const callbackRef = useRef(onCommentAdded);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const sendingRef = useRef(false);
  const mountedRef = useRef(false);

  const [mounted, setMounted] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [myLikes, setMyLikes] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<CommentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [recording, setRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voicePreview, setVoicePreview] = useState("");
  const [voiceUploading, setVoiceUploading] = useState(false);

  useEffect(() => {
    setMounted(true);
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (voicePreview) URL.revokeObjectURL(voicePreview);
    };
    // Le nettoyage du flux audio est géré à la fermeture.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    callbackRef.current = onCommentAdded;
  }, [onCommentAdded]);

  const notifyAdded = useCallback(() => {
    callbackRef.current?.(videoId);
  }, [videoId]);

  const addComment = useCallback((comment: Comment) => {
    if (knownIdsRef.current.has(comment.id)) return false;

    knownIdsRef.current.add(comment.id);
    setComments((previous) => {
      if (previous.some((item) => item.id === comment.id)) {
        return previous;
      }
      return [...previous, comment];
    });

    return true;
  }, []);

  const loadData = useCallback(async (cancelled: () => boolean) => {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (cancelled()) return;

      setCurrentUser(user?.id ?? null);
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

      if (cancelled()) return;
      setUserProfile(ownProfile);

      const { data: rows, error: commentsError } = await supabase
        .from("video_comments")
        .select(
          "id, content, created_at, user_id, parent_comment_id, voice_url"
        )
        .eq("video_id", videoId)
        .order("created_at", { ascending: true });

      if (commentsError) throw commentsError;
      if (cancelled()) return;

      const commentRows = rows ?? [];
      const userIds = [...new Set(commentRows.map((row) => row.user_id))];
      const profileMap: Record<string, CommentProfile> = {};

      if (userIds.length) {
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", userIds);

        if (error) throw error;

        for (const profile of profiles ?? []) {
          profileMap[profile.id] = {
            username: profile.username,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          };
        }
      }

      if (cancelled()) return;

      const loaded: Comment[] = commentRows.map((row) => ({
        ...row,
        parent_comment_id: row.parent_comment_id ?? null,
        voice_url: row.voice_url ?? null,
        profiles: profileMap[row.user_id] ?? null,
      }));

      knownIdsRef.current = new Set(loaded.map((item) => item.id));
      setComments(loaded);

      const ids = loaded.map((item) => item.id);

      if (ids.length) {
        const { data: likeRows, error: likesError } = await supabase
          .from("video_comment_likes")
          .select("comment_id, user_id")
          .in("comment_id", ids);

        if (likesError) throw likesError;
        if (cancelled()) return;

        const counts: Record<string, number> = {};
        const mine: Record<string, boolean> = {};

        for (const like of (likeRows ?? []) as CommentLike[]) {
          counts[like.comment_id] = (counts[like.comment_id] ?? 0) + 1;

          if (user && like.user_id === user.id) {
            mine[like.comment_id] = true;
          }
        }

        setLikes(counts);
        setMyLikes(mine);
      } else {
        setLikes({});
        setMyLikes({});
      }
    } catch (error) {
      if (cancelled()) return;
      console.error("Chargement commentaires :", error);
      setErrorMessage(errorText(error));
      setAuthReady(true);
    } finally {
      if (!cancelled()) setLoading(false);
    }
  }, [supabase, videoId]);

  useEffect(() => {
    let cancelled = false;
    void loadData(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, [loadData]);

  // Realtime : nouveaux commentaires et likes.
  useEffect(() => {
    let active = true;

    const channel = supabase
      .channel(`moshi-comments-${videoId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "video_comments",
          filter: `video_id=eq.${videoId}`,
        },
        async (payload) => {
          const row = payload.new as Comment;

          if (!active || knownIdsRef.current.has(row.id)) return;

          const { data: profile } = await supabase
            .from("profiles")
            .select("username, full_name, avatar_url")
            .eq("id", row.user_id)
            .maybeSingle();

          if (!active) return;

          const inserted = addComment({
            ...row,
            parent_comment_id: row.parent_comment_id ?? null,
            voice_url: row.voice_url ?? null,
            profiles: profile ?? null,
          });

          if (inserted && row.user_id !== currentUser) {
            notifyAdded();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "video_comment_likes",
        },
        (payload) => {
          const row = payload.new as CommentLike;
          if (!active) return;

          setLikes((previous) => ({
            ...previous,
            [row.comment_id]: (previous[row.comment_id] ?? 0) + 1,
          }));

          if (row.user_id === currentUser) {
            setMyLikes((previous) => ({
              ...previous,
              [row.comment_id]: true,
            }));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "video_comment_likes",
        },
        (payload) => {
          const row = payload.old as CommentLike;
          if (!active) return;

          setLikes((previous) => ({
            ...previous,
            [row.comment_id]: Math.max(
              0,
              (previous[row.comment_id] ?? 0) - 1
            ),
          }));

          if (row.user_id === currentUser) {
            setMyLikes((previous) => ({
              ...previous,
              [row.comment_id]: false,
            }));
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
  }, [supabase, videoId, currentUser, addComment, notifyAdded]);

  const sendComment = async (
    content: string,
    voiceUrl: string | null = null
  ) => {
    if (sendingRef.current || !currentUser) return;

    const cleanContent = content.trim();

    if (!cleanContent && !voiceUrl) return;
    if (cleanContent.length > 500) return;

    sendingRef.current = true;
    setSending(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user || user.id !== currentUser) {
        throw new Error("Ta session a expiré. Reconnecte-toi.");
      }

      const { data, error } = await supabase
        .from("video_comments")
        .insert({
          video_id: videoId,
          user_id: user.id,
          content: cleanContent || "🎤 Message vocal",
          parent_comment_id: replyTo?.id ?? null,
          voice_url: voiceUrl,
        })
        .select(
          "id, content, created_at, user_id, parent_comment_id, voice_url"
        )
        .single();

      if (error) throw error;

      const inserted = addComment({
        ...data,
        parent_comment_id: data.parent_comment_id ?? null,
        voice_url: data.voice_url ?? null,
        profiles: userProfile,
      });

      if (inserted) notifyAdded();

      setNewComment("");
      setReplyTo(null);
      setVoiceBlob(null);

      if (voicePreview) {
        URL.revokeObjectURL(voicePreview);
        setVoicePreview("");
      }

      requestAnimationFrame(() => {
        listRef.current?.scrollTo({
          top: listRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
    } catch (error) {
      console.error("Envoi commentaire :", error);
      setErrorMessage(errorText(error));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const toggleCommentLike = async (commentId: string) => {
    if (!currentUser) {
      setErrorMessage("Connecte-toi pour aimer un commentaire.");
      return;
    }

    const wasLiked = !!myLikes[commentId];

    setMyLikes((previous) => ({
      ...previous,
      [commentId]: !wasLiked,
    }));

    setLikes((previous) => ({
      ...previous,
      [commentId]: Math.max(
        0,
        (previous[commentId] ?? 0) + (wasLiked ? -1 : 1)
      ),
    }));

    try {
      if (wasLiked) {
        const { error } = await supabase
          .from("video_comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", currentUser);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("video_comment_likes")
          .insert({
            comment_id: commentId,
            user_id: currentUser,
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error("Like commentaire :", error);
      setMyLikes((previous) => ({
        ...previous,
        [commentId]: wasLiked,
      }));
      setLikes((previous) => ({
        ...previous,
        [commentId]: Math.max(
          0,
          (previous[commentId] ?? 0) + (wasLiked ? 1 : -1)
        ),
      }));
      setErrorMessage(errorText(error));
    }
  };

  const startRecording = async () => {
    if (!currentUser || recording || voiceUploading) return;

    setErrorMessage("");

    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
        throw new Error(
          "L'enregistrement vocal n'est pas pris en charge par ce navigateur."
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      const preferredTypes = [
        "audio/mp4",
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
      ];

      const mimeType = preferredTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/mp4",
        });

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (blob.size > 10 * 1024 * 1024) {
          setErrorMessage("Le fichier vocal dépasse 10 Mo.");
          return;
        }

        const preview = URL.createObjectURL(blob);
        setVoiceBlob(blob);
        setVoicePreview(preview);
      };

      recorder.start();
      setRecording(true);
    } catch (error) {
      console.error("Enregistrement vocal :", error);
      setErrorMessage(errorText(error));
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setRecording(false);
    }
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }

    setRecording(false);
  };

  const discardVoice = () => {
    if (recording) stopRecording();

    if (voicePreview) URL.revokeObjectURL(voicePreview);

    setVoiceBlob(null);
    setVoicePreview("");
  };

  const sendVoice = async () => {
    if (!voiceBlob || !currentUser || voiceUploading) return;

    setVoiceUploading(true);
    setErrorMessage("");

    try {
      const extension = voiceBlob.type.includes("webm")
        ? "webm"
        : voiceBlob.type.includes("ogg")
          ? "ogg"
          : "m4a";

      const path = `${currentUser}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("comment-audio")
        .upload(path, voiceBlob, {
          contentType: voiceBlob.type || "audio/mp4",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("comment-audio")
        .getPublicUrl(path);

      await sendComment("", data.publicUrl);
    } catch (error) {
      console.error("Envoi vocal :", error);
      setErrorMessage(errorText(error));
    } finally {
      setVoiceUploading(false);
    }
  };

  const roots = comments.filter((comment) => !comment.parent_comment_id);

  const repliesFor = (commentId: string) =>
    comments.filter((comment) => comment.parent_comment_id === commentId);

  const renderComment = (comment: Comment, isReply = false) => {
    const name =
      comment.profiles?.username ||
      comment.profiles?.full_name ||
      "Utilisateur";

    const replies = isReply ? [] : repliesFor(comment.id);
    const isExpanded = !!expanded[comment.id];

    return (
      <div
        key={comment.id}
        className={`flex gap-3 ${isReply ? "ml-11 mt-3" : "mt-5"}`}
      >
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
            <span className="text-xs font-bold text-gray-600">
              @{name}
            </span>
            <span className="text-[10px] text-gray-400">
              {formatDate(comment.created_at)}
            </span>
          </div>

          {comment.content &&
            comment.content !== "🎤 Message vocal" && (
              <p className="mt-1 break-words text-sm leading-snug text-moshi-text">
                {comment.content}
              </p>
            )}

          {comment.voice_url && (
            <audio
              controls
              preload="none"
              src={comment.voice_url}
              className="mt-2 h-9 max-w-full"
            />
          )}

          <div className="mt-2 flex items-center gap-5">
            <button
              type="button"
              onClick={() => void toggleCommentLike(comment.id)}
              className={`flex items-center gap-1 text-xs ${
                myLikes[comment.id]
                  ? "font-semibold text-pink-500"
                  : "text-gray-400"
              }`}
              aria-label="Aimer ce commentaire"
            >
              <Heart
                size={15}
                fill={myLikes[comment.id] ? "currentColor" : "none"}
              />
              {likes[comment.id] ?? 0}
            </button>

            {!isReply && (
              <button
                type="button"
                onClick={() => {
                  setReplyTo(comment);
                  setNewComment("");
                  inputRef.current?.focus();
                }}
                className="flex items-center gap-1 text-xs text-gray-400"
              >
                <CornerUpLeft size={14} />
                Répondre
              </button>
            )}
          </div>

          {!isReply && replies.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() =>
                  setExpanded((previous) => ({
                    ...previous,
                    [comment.id]: !previous[comment.id],
                  }))
                }
                className="text-xs font-semibold text-moshi-purple"
              >
                {isExpanded
                  ? "Masquer les réponses"
                  : `Voir les ${replies.length} réponse${replies.length > 1 ? "s" : ""}`}
              </button>

              {isExpanded &&
                replies.map((reply) => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Fermer les commentaires"
        onClick={onClose}
        className="fixed inset-0 z-[9998] bg-black/60"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label="Commentaires"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        className="fixed bottom-0 left-0 right-0 z-[9999] flex flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl"
        style={{
          height: "min(78dvh, 760px)",
          paddingBottom: "env(safe-area-inset-bottom)",
          overscrollBehavior: "contain",
        }}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
          <div className="w-10" />
          <h2 className="font-bold text-moshi-text">
            {comments.length} commentaires
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </header>

        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 pb-5"
          style={{
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
          }}
        >
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-moshi-purple" />
            </div>
          ) : roots.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
              <MessageCircle size={34} />
              <p className="text-center text-sm">
                Sois le premier à commenter !
              </p>
            </div>
          ) : (
            roots.map((comment) => renderComment(comment))
          )}
        </div>

        <footer className="shrink-0 border-t border-gray-100 bg-white px-3 pt-3 pb-2">
          {errorMessage && (
            <div className="mb-2 break-words rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
              {errorMessage}
            </div>
          )}

          {replyTo && (
            <div className="mb-2 flex items-center justify-between rounded-xl bg-purple-50 px-3 py-2">
              <span className="truncate text-xs text-purple-700">
                Réponse à @{replyTo.profiles?.username || replyTo.profiles?.full_name || "Utilisateur"}
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                aria-label="Annuler la réponse"
                className="ml-2 text-purple-700"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {voicePreview && (
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-gray-100 p-2">
              <audio
                controls
                src={voicePreview}
                className="h-9 min-w-0 flex-1"
              />
              <button
                type="button"
                onClick={discardVoice}
                aria-label="Supprimer le vocal"
                className="rounded-full p-2 text-red-500"
              >
                <Trash2 size={18} />
              </button>
              <button
                type="button"
                disabled={voiceUploading || sending}
                onClick={() => void sendVoice()}
                aria-label="Envoyer le vocal"
                className="rounded-full p-2 text-moshi-purple disabled:opacity-40"
              >
                {voiceUploading || sending ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
          )}

          {!authReady ? (
            <div className="flex justify-center py-2">
              <Loader2 size={18} className="animate-spin text-moshi-purple" />
            </div>
          ) : !currentUser ? (
            <p className="py-2 text-center text-sm text-gray-500">
              Connecte-toi pour commenter.
            </p>
          ) : (
            <>
              {recording && (
                <div className="mb-2 flex items-center justify-center gap-2 text-xs font-semibold text-red-500">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  Enregistrement en cours — appuie sur arrêter
                </div>
              )}

              <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2">
                <button
                  type="button"
                  onClick={() => {
                    if (recording) stopRecording();
                    else void startRecording();
                  }}
                  disabled={sending || voiceUploading || !!voicePreview}
                  aria-label={recording ? "Arrêter le vocal" : "Enregistrer un vocal"}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    recording ? "bg-red-500 text-white" : "text-moshi-purple"
                  } disabled:opacity-40`}
                >
                  {recording ? <Square size={17} /> : <Mic size={19} />}
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  inputMode="text"
                  enterKeyHint="send"
                  autoComplete="off"
                  autoCorrect="on"
                  spellCheck
                  maxLength={500}
                  placeholder={
                    recording
                      ? "Enregistrement vocal..."
                      : "Ajouter un commentaire..."
                  }
                  value={newComment}
                  disabled={sending || recording || !!voicePreview}
                  onChange={(event) => setNewComment(event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                  onTouchStart={(event) => event.stopPropagation()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void sendComment(newComment);
                    }
                  }}
                  className="min-h-9 min-w-0 flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={() => void sendComment(newComment)}
                  disabled={sending || !newComment.trim() || recording}
                  aria-label="Envoyer le commentaire"
                  className="flex h-9 w-9 shrink-0 items-center justify-center text-moshi-purple disabled:opacity-40"
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
    </>,
    document.body
  );
}

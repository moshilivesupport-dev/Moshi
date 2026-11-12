"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Send, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatNumber } from "@/lib/utils";

interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  content: string;
  likes_count: number;
  created_at: string;
}

interface CommentsSheetProps {
  videoId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

export default function CommentsSheet({ videoId, isOpen, onClose, currentUser }: CommentsSheetProps) {
  const supabase = createClient();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Charger les commentaires
  useEffect(() => {
    if (!isOpen) return;

    const loadComments = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("video_comments")
        .select("id, user_id, content, likes_count, created_at, profiles:user_id(username, avatar_url)")
        .eq("video_id", videoId)
        .order("created_at", { ascending: true })
        .limit(100);

      const formatted: Comment[] = (data || []).map((c: any) => ({
        id: c.id,
        user_id: c.user_id,
        user_name: c.profiles?.username || "Utilisateur",
        user_avatar: c.profiles?.avatar_url,
        content: c.content,
        likes_count: c.likes_count || 0,
        created_at: c.created_at,
      }));

      setComments(formatted);
      setLoading(false);
    };

    loadComments();
  }, [videoId, isOpen, supabase]);

  // Écouter les nouveaux commentaires en temps réel
  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase
      .channel(`comments-${videoId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "video_comments", filter: `video_id=eq.${videoId}` },
        async (payload) => {
          // Récupérer les infos du profil du nouveau commentaire
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", payload.new.user_id)
            .single();

          const newComment: Comment = {
            id: payload.new.id,
            user_id: payload.new.user_id,
            user_name: profile?.username || "Utilisateur",
            user_avatar: profile?.avatar_url,
            content: payload.new.content,
            likes_count: 0,
            created_at: payload.new.created_at,
          };

          setComments((prev) => [...prev, newComment]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoId, isOpen, supabase]);

  // Scroll automatique vers le bas
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [comments]);

  const sendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;

    setSending(true);
    try {
      await supabase.from("video_comments").insert({
        video_id: videoId,
        user_id: currentUser.id,
        content: newComment.trim(),
      });
      setNewComment("");
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const timeAgo = (dateString: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return "maintenant";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
    return `${Math.floor(seconds / 86400)} j`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Panneau */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-900 rounded-t-3xl border-t border-neutral-800 h-[65vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
              <h3 className="text-sm font-bold text-white">
                {formatNumber(comments.length)} commentaire{comments.length > 1 ? "s" : ""}
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 transition"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Liste des commentaires */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <MessageCircle className="w-12 h-12 text-neutral-700 mb-3" />
                  <p className="text-sm text-neutral-400">Aucun commentaire pour le moment</p>
                  <p className="text-xs text-neutral-500 mt-1">Soyez le premier à commenter !</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0">
                        {comment.user_avatar ? (
                          <img src={comment.user_avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                            {comment.user_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-400">
                            {comment.user_name}
                          </span>
                          <span className="text-[10px] text-neutral-600">
                            {timeAgo(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-white mt-0.5 break-words">{comment.content}</p>
                      </div>

                      {/* Like du commentaire */}
                      <button className="flex flex-col items-center gap-0.5 pt-2">
                        <Heart className="w-3.5 h-3.5 text-neutral-500 hover:text-red-500 transition" />
                        {comment.likes_count > 0 && (
                          <span className="text-[10px] text-neutral-500">
                            {formatNumber(comment.likes_count)}
                          </span>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Input d'envoi */}
            {currentUser ? (
              <form
                onSubmit={sendComment}
                className="flex items-center gap-2 px-4 py-3 border-t border-neutral-800"
              >
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Ajouter un commentaire..."
                  maxLength={300}
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-full px-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-red-500/50 transition"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || sending}
                  className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </form>
            ) : (
              <div className="px-4 py-3 border-t border-neutral-800 text-center">
                <a href="/auth/login" className="text-red-500 text-sm font-semibold">
                  Connectez-vous pour commenter
                </a>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Icône pour l'état vide
function MessageCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

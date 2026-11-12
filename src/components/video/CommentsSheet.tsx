"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Send } from "lucide-react";

interface CommentsSheetProps {
  videoId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

export default function CommentsSheet({ videoId, isOpen, onClose, currentUser }: CommentsSheetProps) {
  const supabase = createClient();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadComments();
  }, [isOpen, videoId]);

  const loadComments = async () => {
    const { data } = await supabase
      .from("video_comments")
      .select("*, profiles:user_id(username, avatar_url)")
      .eq("video_id", videoId)
      .order("created_at", { ascending: false })
      .limit(50);
    setComments(data || []);
  };

  const sendComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    setSending(true);
    try {
      await supabase.from("video_comments").insert({
        video_id: videoId,
        user_id: currentUser.id,
        content: newComment.trim(),
      });
      setNewComment("");
      await loadComments();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi");
    }
    setSending(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg bg-neutral-900 rounded-t-2xl max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h3 className="font-bold text-white">{comments.length} commentaires</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-full"><X className="w-5 h-5 text-white" /></button>
        </div>

        {/* Liste des commentaires */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <p className="text-center text-neutral-500 text-sm py-8">Soyez le premier à commenter !</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0">
                  {comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-bold">{comment.profiles?.username?.charAt(0).toUpperCase() || "?"}</div>}
                </div>
                <div className="flex-1">
                  <p className="text-xs text-neutral-400 font-semibold">{comment.profiles?.username || "Anonyme"}</p>
                  <p className="text-sm text-white">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input commentaire */}
        {currentUser && (
          <div className="p-4 border-t border-neutral-800 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendComment()}
              placeholder="Ajouter un commentaire..."
              className="flex-1 bg-neutral-800 text-white px-4 py-2 rounded-full text-sm outline-none focus:ring-2 focus:ring-red-500"
            />
            <button onClick={sendComment} disabled={!newComment.trim() || sending} className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 disabled:bg-neutral-700 flex items-center justify-center transition">
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

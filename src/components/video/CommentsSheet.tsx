"use client";

import { useEffect, useState, useRef } from "react";
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

export default function CommentsSheet({ videoId, onClose }: CommentsSheetProps) {
  const supabase = createClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      // 1. Charger l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setUserProfile(profile);
      }

      // 2. Charger les commentaires
      const { data } = await supabase
        .from("comments")
        .select("id, content, created_at, user_id")
        .eq("video_id", videoId)
        .order("created_at", { ascending: true });

      if (data) {
        // Récupérer les profils des auteurs
        const userIds = [...new Set(data.map(c => c.user_id))];
        const { data: profilesData } = await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", userIds);
        
        const profilesMap: Record<string, any> = {};
        (profilesData || []).forEach(p => { profilesMap[p.id] = p; });

        const merged = data.map(c => ({ ...c, profiles: profilesMap[c.user_id] || null }));
        setComments(merged as Comment[]);
      }
      setLoading(false);
    };
    loadData();
  }, [videoId, supabase]);

  const handleSend = async () => {
    if (!newComment.trim() || !currentUser) return;
    setSending(true);

    const { data, error } = await supabase.from("comments").insert({
      video_id: videoId,
      user_id: currentUser.id,
      content: newComment.trim(),
    }).select().single();

    if (!error && data) {
      setComments([...comments, { ...data, profiles: userProfile }]);
      setNewComment("");
      setTimeout(() => { scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" }); }, 100);
    }
    setSending(false);
  };

  return (
    <>
      {/* Overlay sombre */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      
      {/* Modale */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl h-[75dvh] flex flex-col animate-slide-up">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between relative">
          <div className="w-10" />
          <h2 className="font-bold text-moshi-text">{comments.length} commentaires</h2>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center"><X size={20} /></button>
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Liste des commentaires */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-moshi-purple" /></div>
          ) : comments.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">Sois le premier à commenter !</p>
          ) : (
            comments.map(c => {
              const name = c.profiles?.username || c.profiles?.full_name || "Utilisateur";
              return (
                <div key={c.id} className="flex gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden shrink-0">
                    {c.profiles?.avatar_url ? (
                      <Image src={c.profiles.avatar_url} alt={name} width={36} height={36} className="w-full h-full object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-moshi-purple">{name.charAt(0).toUpperCase()}</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-500">@{name}</p>
                    <p className="text-sm text-moshi-text leading-snug mt-0.5">{c.content}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Barre de saisie */}
        <div className="p-3 border-t border-gray-100 bg-white pb-safe">
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
            <input
              type="text"
              placeholder="Ajouter un commentaire..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 bg-transparent outline-none text-sm"
            />
            <button onClick={handleSend} disabled={sending || !newComment.trim()} className="text-moshi-purple disabled:opacity-50 p-1">
              {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
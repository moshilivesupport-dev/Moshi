"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface ChatMessage {
  id: string;
  user_name: string;
  user_avatar: string | null;
  message: string;
  created_at: string;
}

interface LiveChatProps {
  sessionId: string;
}

export default function LiveChat({ sessionId }: LiveChatProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Charger l'historique récent
  useEffect(() => {
    const loadMessages = async () => {
      const { data } = await supabase
        .from("live_messages")
        .select("id, user_name, user_avatar, message, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(50);
      
      if (data) setMessages(data);
    };
    loadMessages();
  }, [sessionId, supabase]);

  // 2. Écouter les nouveaux messages en temps réel
  useEffect(() => {
    const channel = supabase
      .channel(`live-chat-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_messages", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setMessages((prev) => [...prev.slice(-49), payload.new as ChatMessage]); // Garde les 50 derniers
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  // 3. Scroll automatique vers le bas
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 4. Envoyer un message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .single();

    await supabase.from("live_messages").insert({
      session_id: sessionId,
      user_id: user.id,
      user_name: profile?.username || "Utilisateur",
      user_avatar: profile?.avatar_url,
      message: newMessage.trim(),
    });

    setNewMessage("");
  };

  return (
    <div className="absolute bottom-20 left-4 right-20 z-30 flex flex-col justify-end h-64 pointer-events-none">
      {/* Zone des messages (dégradé pour lisibilité) */}
      <div className="flex-1 overflow-y-auto scrollbar-hide mask-image-gradient pointer-events-auto">
        <div className="flex flex-col gap-2 pb-2">
          {messages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-6 h-6 rounded-full bg-neutral-700 overflow-hidden flex-shrink-0">
                {msg.user_avatar ? (
                  <img src={msg.user_avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold">
                    {msg.user_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-2xl rounded-tl-none">
                <span className="text-xs font-bold text-red-400 mr-1.5">{msg.user_name}</span>
                <span className="text-xs text-white">{msg.message}</span>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input d'envoi */}
      <form onSubmit={sendMessage} className="mt-2 flex items-center gap-2 pointer-events-auto">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Dire quelque chose..."
          className="flex-1 bg-black/50 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder-neutral-400 focus:outline-none focus:border-red-500/50 transition-colors"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="w-9 h-9 rounded-full bg-red-500 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition"
        >
          <svg className="w-4 h-4 text-white fill-current" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  );
}

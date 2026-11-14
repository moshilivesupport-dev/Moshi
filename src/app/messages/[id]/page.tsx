"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, Send, Loader2 } from "lucide-react";

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const otherUserId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Charger la conversation
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setCurrentUser(user);

      // Charger le profil de l'autre utilisateur
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .eq("id", otherUserId)
        .maybeSingle();

      setOtherUser(profile);

      // Charger les messages
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      setMessages(msgs || []);
      setLoading(false);
    };
    load();
  }, [otherUserId, supabase, router]);

  // Écouter les nouveaux messages en temps réel
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase
      .channel(`messages-${otherUserId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as any;
        if (
          (msg.sender_id === currentUser.id && msg.receiver_id === otherUserId) ||
          (msg.sender_id === otherUserId && msg.receiver_id === currentUser.id)
        ) {
          setMessages((prev) => [...prev, msg]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser, otherUserId, supabase]);

  // Scroll auto
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    const { error } = await supabase.from("messages").insert({
      sender_id: currentUser.id,
      receiver_id: otherUserId,
      content,
    });

    if (error) alert("Erreur d'envoi");
    setSending(false);
  };

  if (loading) {
    return <div className="min-h-[100dvh] bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 text-neutral-500 animate-spin" /></div>;
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-neutral-800 px-3 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-800">
          {otherUser?.avatar_url ? (
            <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm font-bold">
              {(otherUser?.username?.[0] || "U").toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold">{otherUser?.full_name || otherUser?.username || "Utilisateur"}</p>
          <p className="text-xs text-neutral-400">@{otherUser?.username}</p>
        </div>
      </header>

      {/* Liste des messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {messages.length === 0 ? (
          <div className="text-center text-neutral-500 text-sm py-10">
            Aucun message pour le moment. Envoie le premier !
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === currentUser?.id;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                  isMine ? "bg-red-500 text-white" : "bg-neutral-800 text-white"
                }`}>
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Zone de saisie */}
      <form onSubmit={sendMessage} className="p-3 border-t border-neutral-800 flex items-center gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Écrire un message..."
          className="flex-1 bg-neutral-900 text-white text-sm px-4 py-3 rounded-full outline-none"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="p-3 bg-red-500 rounded-full disabled:opacity-50"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </form>
    </div>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";

interface Message {
  id: string;
  user_id: string;
  content: string;
  username?: string;
  avatar_url?: string;
  is_subscriber?: boolean;
  created_at: string;
}

interface Props {
  streamId: string;
  currentUserId?: string;
}

// Simple auto-translation stub (replace with real API)
const translateStub = (text: string, _target: string) => text;

export function LiveChat({ streamId, currentUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    // Load recent messages
    supabase
      .from("live_messages")
      .select("*, profiles(username, avatar_url)")
      .eq("stream_id", streamId)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data) {
          setMessages(
            data.map((m: any) => ({
              id: m.id,
              user_id: m.user_id,
              content: m.content,
              username: m.profiles?.username,
              avatar_url: m.profiles?.avatar_url,
              created_at: m.created_at,
            }))
          );
        }
      });

    // Realtime subscription
    const channel = supabase
      .channel(`live-chat-${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_messages",
          filter: `stream_id=eq.${streamId}`,
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", payload.new.user_id)
            .single();
          setMessages((prev) => [
            ...prev,
            {
              id: payload.new.id,
              user_id: payload.new.user_id,
              content: payload.new.content,
              username: profile?.username,
              avatar_url: profile?.avatar_url,
              created_at: payload.new.created_at,
            },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !currentUserId || sending) return;
    setSending(true);
    try {
      await supabase.from("live_messages").insert({
        stream_id: streamId,
        user_id: currentUserId,
        content: input.trim(),
      });
      setInput("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden border border-white/5">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Discussion Live</h3>
        <span className="text-xs text-muted">{messages.length} messages</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.map((m) => (
          <div key={m.id} className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-anthracite overflow-hidden flex-shrink-0">
              {m.avatar_url ? (
                <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted">
                  {(m.username || "?")[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={cn("text-xs font-semibold", m.is_subscriber ? "text-champagne" : "text-coral")}>
                  {m.username || "Anonyme"}
                </span>
                {m.is_subscriber && (
                  <span className="text-[10px] bg-gold/20 text-gold px-1.5 py-0.5 rounded-full">Abonné</span>
                )}
              </div>
              <p className="text-sm text-white/90 break-words">{m.content}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-white/5 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Écrire un message..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-muted focus:outline-none focus:border-coral"
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          className="w-10 h-10 rounded-xl bg-coral flex items-center justify-center disabled:opacity-40"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}

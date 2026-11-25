
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Send, Loader2, MessageCircle } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";

type ChatMessage = {
  id: string;
  userId: string;
  name: string;
  avatar: string | null;
  text: string;
  createdAt: number;
};

type Props = {
  liveId: string;
};

export default function LiveMatchChat({ liveId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("Spectateur");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadIdentity() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled || !user) return;

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("username,full_name,avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      setUserName(
        profile?.full_name || profile?.username || "Spectateur"
      );
      setAvatar(profile?.avatar_url || null);
    }

    void loadIdentity();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!liveId) return;

    let cancelled = false;

    const channel = supabase
      .channel(`live-match-chat-${liveId}`, {
        config: {
          broadcast: {
            self: false,
          },
        },
      })
      .on("broadcast", { event: "message" }, ({ payload }) => {
        const incoming = payload as ChatMessage;

        if (
          !incoming?.id ||
          !incoming?.text ||
          !incoming?.userId
        ) {
          return;
        }

        setMessages((previous) => {
          if (previous.some((item) => item.id === incoming.id)) {
            return previous;
          }

          return [...previous, incoming].slice(-60);
        });
      })
      .subscribe((status) => {
        if (cancelled) return;
        setReady(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    return () => {
      cancelled = true;
      channelRef.current = null;
      setReady(false);
      void supabase.removeChannel(channel);
    };
  }, [liveId, supabase]);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = message.trim();

    if (!text || !userId || !ready || sending) return;

    const channel = channelRef.current;
    if (!channel) return;

    const outgoing: ChatMessage = {
      id: crypto.randomUUID(),
      userId,
      name: userName,
      avatar,
      text: text.slice(0, 300),
      createdAt: Date.now(),
    };

    setSending(true);
    setMessage("");

    setMessages((previous) =>
      [...previous, outgoing].slice(-60)
    );

    try {
      const result = await channel.send({
        type: "broadcast",
        event: "message",
        payload: outgoing,
      });

      if (result !== "ok") {
        setMessages((previous) =>
          previous.filter((item) => item.id !== outgoing.id)
        );
        setMessage(text);
      }
    } catch (error) {
      console.error("Envoi du message Match Live :", error);

      setMessages((previous) =>
        previous.filter((item) => item.id !== outgoing.id)
      );
      setMessage(text);
    } finally {
      setSending(false);
    }
  }, [message, userId, ready, sending, userName, avatar]);

  return (
    <section className="pointer-events-auto absolute bottom-[118px] left-3 right-3 z-30 mx-auto flex max-w-md flex-col">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-bold text-white/75">
        <MessageCircle size={13} />
        CHAT DU MATCH
        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
        <span className="font-normal text-white/45">
          {ready ? "Connecté" : "Connexion…"}
        </span>
      </div>

      <div className="max-h-32 space-y-2 overflow-y-auto pr-1 [mask-image:linear-gradient(to_bottom,transparent,black_12%)]">
        {messages.slice(-12).map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2"
          >
            <div className="relative mt-0.5 h-6 w-6 shrink-0 overflow-hidden rounded-full border border-white/20 bg-black/70">
              {item.avatar ? (
                <Image
                  src={item.avatar}
                  alt=""
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full items-center justify-center text-[9px] font-bold">
                  {item.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <p className="max-w-[85%] rounded-xl bg-black/55 px-2.5 py-1.5 text-[11px] leading-snug text-white shadow backdrop-blur">
              <span className="mr-1 font-extrabold text-pink-300">
                {item.name}
              </span>
              {item.text}
            </p>
          </div>
        ))}

        <div ref={endRef} />
      </div>

      <form
        className="mt-2 flex items-center gap-2 rounded-full border border-white/15 bg-black/75 p-1.5 backdrop-blur-xl"
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage();
        }}
      >
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={300}
          placeholder={
            userId
              ? "Écrire un commentaire..."
              : "Connecte-toi pour commenter"
          }
          disabled={!userId || !ready || sending}
          className="min-w-0 flex-1 bg-transparent px-3 text-xs text-white outline-none placeholder:text-white/45 disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={!message.trim() || !userId || !ready || sending}
          aria-label="Envoyer le message"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-purple-600 disabled:opacity-40"
        >
          {sending ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Send size={14} />
          )}
        </button>
      </form>
    </section>
  );
}

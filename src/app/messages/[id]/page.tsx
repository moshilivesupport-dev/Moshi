
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  read: boolean;
  created_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = String(params.id);

  const supabase = createClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [userId, setUserId] = useState("");
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadMessages = useCallback(async (currentUserId: string) => {
    const { data, error: messageError } = await supabase
      .from("messages")
      .select(
        "id,conversation_id,sender_id,receiver_id,content,read,created_at"
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (messageError) throw messageError;

    const loaded = (data || []) as Message[];
    setMessages(loaded);

    const unreadIds = loaded
      .filter((m) => m.receiver_id === currentUserId && !m.read)
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      const { error: updateError } = await supabase
        .from("messages")
        .update({ read: true })
        .in("id", unreadIds)
        .eq("receiver_id", currentUserId);

      if (updateError) console.error("Marquage comme lu :", updateError);
    }

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, [conversationId, supabase]);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function initialize() {
      try {
        const { data: auth, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;

        const currentUser = auth.user;
        if (!currentUser) {
          router.push("/login");
          return;
        }

        if (!active) return;
        setUserId(currentUser.id);

        const { data: membership, error: membershipError } =
          await supabase
            .from("conversation_members")
            .select("user_id")
            .eq("conversation_id", conversationId);

        if (membershipError) throw membershipError;

        const members = membership || [];

        if (!members.some((m) => m.user_id === currentUser.id)) {
          throw new Error("Tu n'as pas accès à cette conversation.");
        }

        const otherMember = members.find(
          (m) => m.user_id !== currentUser.id
        );

        if (!otherMember) {
          throw new Error("Destinataire introuvable.");
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id,username,full_name,avatar_url")
          .eq("id", otherMember.user_id)
          .single();

        if (profileError) throw profileError;

        if (!active) return;
        setOtherUser(profile as Profile);

        await loadMessages(currentUser.id);

        if (!active) return;

        channel = supabase
          .channel(`messages-${conversationId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "messages",
              filter: `conversation_id=eq.${conversationId}`,
            },
            () => {
              loadMessages(currentUser.id).catch(console.error);
            }
          )
          .subscribe();
      } catch (e) {
        console.error("Ouverture conversation :", e);
        if (active) {
          setError(
            e instanceof Error
              ? e.message
              : "Impossible d'ouvrir cette conversation."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [conversationId, loadMessages, router, supabase]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();

    const text = content.trim();
    if (!text || !userId || !otherUser || sending) return;

    setSending(true);
    setError("");

    try {
      const { error: insertError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          receiver_id: otherUser.id,
          content: text,
          read: false,
        });

      if (insertError) throw insertError;

      setContent("");
      await loadMessages(userId);

      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    } catch (e) {
      console.error("Envoi message :", e);
      setError(
        e instanceof Error ? e.message : "Impossible d'envoyer le message."
      );
    } finally {
      setSending(false);
    }
  }

  const displayName =
    otherUser?.full_name || otherUser?.username || "Conversation";

  function formatTime(date: string) {
    return new Date(date).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main className="min-h-[100dvh] bg-moshi-bg flex flex-col">
      <header className="sticky top-0 z-20 bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <Link href="/messages" aria-label="Retour aux messages">
          <ArrowLeft className="w-6 h-6" />
        </Link>

        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-moshi-purple font-bold">
          {displayName.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0">
          <h1 className="font-bold truncate">{displayName}</h1>
          <p className="text-xs text-gray-500">
            @{otherUser?.username || "utilisateur"}
          </p>
        </div>
      </header>

      <section className="flex-1 w-full max-w-2xl mx-auto p-4 space-y-3">
        {loading ? (
          <p className="text-center py-16 text-gray-500 text-sm">
            Chargement des messages...
          </p>
        ) : error && messages.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-red-500">{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <MessageCircle className="w-12 h-12 mx-auto mb-3" />
            <p className="text-sm">Commencez la conversation !</p>
          </div>
        ) : (
          messages.map((message) => {
            const mine = message.sender_id === userId;

            return (
              <div
                key={message.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-2.5 shadow-sm ${
                    mine
                      ? "bg-moshi-purple text-white rounded-br-sm"
                      : "bg-white text-moshi-text rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  <div
                    className={`text-[10px] mt-1 text-right ${
                      mine ? "text-white/70" : "text-gray-400"
                    }`}
                  >
                    {formatTime(message.created_at)}
                    {mine && (message.read ? " · Lu" : " · Envoyé")}
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={bottomRef} />
      </section>

      {error && messages.length > 0 && (
        <p className="text-center text-xs text-red-500 px-4 pb-2">
          {error}
        </p>
      )}

      <form
        onSubmit={sendMessage}
        className="sticky bottom-0 bg-white border-t border-gray-100 p-3 flex items-center gap-2"
      >
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Écrire un message..."
          maxLength={5000}
          disabled={loading || sending || !userId}
          className="flex-1 min-w-0 rounded-full bg-gray-100 px-4 py-3 text-sm outline-none"
        />

        <button
          type="submit"
          disabled={!content.trim() || sending || loading}
          aria-label="Envoyer"
          className="w-11 h-11 rounded-full bg-moshi-purple text-white flex items-center justify-center disabled:opacity-40"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </main>
  );
}

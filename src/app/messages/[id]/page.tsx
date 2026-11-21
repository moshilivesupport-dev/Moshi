
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  MessageCircle,
  RefreshCw,
  ShieldAlert,
  Loader2,
} from "lucide-react";
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

type AccessState =
  | "checking"
  | "available"
  | "unavailable";

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();

  const conversationId = String(params.id);
  const supabase = useMemo(() => createClient(), []);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState("");
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [accessState, setAccessState] =
    useState<AccessState>("checking");

  const loadMessages = useCallback(
    async (currentUserId: string) => {
      const { data, error: messageError } = await supabase
        .from("messages")
        .select(
          "id,conversation_id,sender_id,receiver_id,content,read,created_at"
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(500);

      if (messageError) throw messageError;

      const loaded = (data ?? []) as Message[];

      setMessages(loaded);

      const unreadIds = loaded
        .filter(
          (message) =>
            message.receiver_id === currentUserId &&
            message.read !== true
        )
        .map((message) => message.id);

      if (unreadIds.length > 0) {
        const { error: updateError } = await supabase
          .from("messages")
          .update({ read: true })
          .in("id", unreadIds)
          .eq("receiver_id", currentUserId);

        if (updateError) {
          console.error("Marquage comme lu :", updateError);
        }
      }
    },
    [conversationId, supabase]
  );

  const checkConversationAccess = useCallback(
    async (currentUserId: string) => {
      const { data: members, error: membershipError } =
        await supabase
          .from("conversation_members")
          .select("user_id")
          .eq("conversation_id", conversationId);

      if (membershipError) throw membershipError;

      const visibleMembers = members ?? [];

      const isMember = visibleMembers.some(
        (member) => member.user_id === currentUserId
      );

      const otherMember = visibleMembers.find(
        (member) => member.user_id !== currentUserId
      );

      if (!isMember || !otherMember) {
        setAccessState("unavailable");
        setOtherUser(null);
        setMessages([]);
        setContent("");
        return false;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("id,username,full_name,avatar_url")
          .eq("id", otherMember.user_id)
          .single();

      if (profileError) throw profileError;

      setOtherUser(profile as Profile);
      setAccessState("available");

      return true;
    },
    [conversationId, supabase]
  );

  const refreshConversation = useCallback(
    async (currentUserId: string) => {
      const canAccess = await checkConversationAccess(currentUserId);

      if (!canAccess) return;

      await loadMessages(currentUserId);
    },
    [checkConversationAccess, loadMessages]
  );

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function initialize() {
      setLoading(true);
      setError("");
      setAccessState("checking");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          router.push("/login");
          return;
        }

        if (!active) return;

        setUserId(user.id);

        const canAccess = await checkConversationAccess(user.id);

        if (!active) return;

        if (!canAccess) {
          return;
        }

        await loadMessages(user.id);

        if (!active) return;

        channel = supabase
          .channel(`conversation-${conversationId}-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "messages",
              filter: `conversation_id=eq.${conversationId}`,
            },
            () => {
              if (active) {
                void refreshConversation(user.id).catch((err) => {
                  console.error(
                    "Actualisation des messages :",
                    err
                  );
                });
              }
            }
          )
          .subscribe((status) => {
            if (status === "CHANNEL_ERROR") {
              console.error(
                "Erreur de connexion Realtime à la conversation."
              );
            }
          });
      } catch (err) {
        console.error("Ouverture conversation :", err);

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Impossible d'ouvrir cette conversation."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialize();

    return () => {
      active = false;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [
    conversationId,
    checkConversationAccess,
    loadMessages,
    refreshConversation,
    router,
    supabase,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  async function handleRefresh() {
    if (!userId || refreshing || accessState !== "available") {
      return;
    }

    setRefreshing(true);
    setError("");

    try {
      await refreshConversation(userId);
    } catch (err) {
      console.error("Actualisation conversation :", err);
      setError("Impossible d'actualiser la conversation.");
    } finally {
      setRefreshing(false);
    }
  }

  async function sendMessage(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const text = content.trim();

    if (
      !text ||
      !userId ||
      !otherUser ||
      sending ||
      loading ||
      accessState !== "available"
    ) {
      return;
    }

    setSending(true);
    setError("");

    try {
      // Vérifie à nouveau l'accès juste avant l'envoi.
      const canAccess = await checkConversationAccess(userId);

      if (!canAccess) {
        setError(
          "Cette conversation n'est plus accessible. L'envoi est désactivé."
        );
        return;
      }

      const { error: insertError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          receiver_id: otherUser.id,
          content: text,
          read: false,
        });

      if (insertError) {
        if (
          insertError.code === "42501" ||
          insertError.code === "PGRST116"
        ) {
          setAccessState("unavailable");
          setMessages([]);
          setContent("");
          setOtherUser(null);
          setError(
            "Cette conversation n'est plus accessible. L'envoi a été refusé."
          );
          return;
        }

        throw insertError;
      }

      setContent("");

      await loadMessages(userId);

      inputRef.current?.focus();
    } catch (err) {
      console.error("Envoi message :", err);

      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'envoyer le message."
      );
    } finally {
      setSending(false);
    }
  }

  const displayName =
    otherUser?.full_name ||
    otherUser?.username ||
    "Conversation";

  function formatTime(date: string) {
    return new Date(date).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main className="min-h-[100dvh] bg-moshi-bg flex flex-col">
      <header className="sticky top-0 z-20 bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <Link
          href="/messages"
          aria-label="Retour aux messages"
          className="shrink-0"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>

        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-moshi-purple font-bold shrink-0">
          {displayName.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="font-bold truncate">
            {displayName}
          </h1>

          <p className="text-xs text-gray-500 truncate">
            {accessState === "unavailable"
              ? "Conversation inaccessible"
              : otherUser?.username
                ? `@${otherUser.username}`
                : "Messagerie Moshi"}
          </p>
        </div>

        {accessState === "available" && (
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            aria-label="Actualiser les messages"
            className="p-2 text-gray-500 disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
          </button>
        )}
      </header>

      {loading ? (
        <section className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-moshi-purple mb-3" />
            <p className="text-sm text-gray-500">
              Vérification de la conversation...
            </p>
          </div>
        </section>
      ) : accessState === "unavailable" ? (
        <section className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-sm w-full bg-white rounded-3xl p-7 text-center shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>

            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Conversation inaccessible
            </h2>

            <p className="text-sm leading-6 text-gray-500">
              Cette conversation n'est plus accessible. Elle a
              peut-être été rendue indisponible à la suite d'un
              blocage entre les participants, ou ton accès a été
              retiré.
            </p>

            <Link
              href="/messages"
              className="inline-flex items-center justify-center mt-6 w-full rounded-full bg-moshi-purple text-white font-semibold py-3"
            >
              Retour à la messagerie
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="flex-1 w-full max-w-2xl mx-auto p-4 space-y-3">
            {error && (
              <p className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">
                {error}
              </p>
            )}

            {messages.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <MessageCircle className="w-12 h-12 mx-auto mb-3" />

                <p className="text-sm">
                  Commencez la conversation !
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const mine = message.sender_id === userId;

                return (
                  <div
                    key={message.id}
                    className={`flex ${
                      mine ? "justify-end" : "justify-start"
                    }`}
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
                          mine
                            ? "text-white/70"
                            : "text-gray-400"
                        }`}
                      >
                        {formatTime(message.created_at)}
                        {mine &&
                          (message.read ? " · Lu" : " · Envoyé")}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={bottomRef} />
          </section>

          <form
            onSubmit={sendMessage}
            className="sticky bottom-0 bg-white border-t border-gray-100 p-3 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Écrire un message..."
              maxLength={5000}
              disabled={
                loading ||
                sending ||
                !userId ||
                !otherUser ||
                accessState !== "available"
              }
              className="flex-1 min-w-0 rounded-full bg-gray-100 px-4 py-3 text-sm outline-none"
            />

            <button
              type="submit"
              disabled={
                !content.trim() ||
                sending ||
                loading ||
                !otherUser ||
                accessState !== "available"
              }
              aria-label="Envoyer"
              className="w-11 h-11 rounded-full bg-moshi-purple text-white flex items-center justify-center disabled:opacity-40"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </>
      )}
    </main>
  );
}

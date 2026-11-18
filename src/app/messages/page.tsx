
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Edit3, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import StoriesBar from "@/components/home/StoriesBar";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type Conversation = {
  id: string;
  updated_at: string;
  otherUser: Profile;
  lastMessage: string;
  unread: number;
};

export default function MessagesPage() {
  const supabase = createClient();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadConversations() {
    setLoading(true);
    setError("");

    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: memberships, error: membershipError } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user.id);

      if (membershipError) throw membershipError;

      const conversationIds = [
        ...new Set((memberships || []).map((m) => m.conversation_id)),
      ];

      if (conversationIds.length === 0) {
        setConversations([]);
        return;
      }

      const { data: allMembers, error: membersError } = await supabase
        .from("conversation_members")
        .select("conversation_id,user_id")
        .in("conversation_id", conversationIds);

      if (membersError) throw membersError;

      const otherUserIds = [
        ...new Set(
          (allMembers || [])
            .map((m) => m.user_id)
            .filter((id) => id !== user.id)
        ),
      ];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url")
        .in("id", otherUserIds);

      if (profilesError) throw profilesError;

      const { data: conversationRows, error: conversationError } =
        await supabase
          .from("conversations")
          .select("id,updated_at")
          .in("id", conversationIds)
          .order("updated_at", { ascending: false });

      if (conversationError) throw conversationError;

      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select("id,conversation_id,sender_id,receiver_id,content,read,created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false });

      if (messagesError) throw messagesError;

      const result: Conversation[] = (conversationRows || []).map((conv) => {
        const member = (allMembers || []).find(
          (m) => m.conversation_id === conv.id && m.user_id !== user.id
        );

        const otherUser = (profiles || []).find(
          (p) => p.id === member?.user_id
        );

        const latest = (messages || []).find(
          (m) => m.conversation_id === conv.id
        );

        const unread = (messages || []).filter(
          (m) =>
            m.conversation_id === conv.id &&
            m.receiver_id === user.id &&
            !m.read
        ).length;

        return {
          id: conv.id,
          updated_at: conv.updated_at,
          otherUser: otherUser || {
            id: member?.user_id || "",
            username: "Utilisateur",
            full_name: "Utilisateur",
            avatar_url: null,
          },
          lastMessage: latest?.content || "Nouvelle conversation",
          unread,
        };
      });

      setConversations(result);
    } catch (e) {
      console.error("Chargement messagerie :", e);
      setError("Impossible de charger les conversations.");
    } finally {
      setLoading(false);
    }
  }

  async function startConversation() {
    if (!username.trim()) return;

    setCreating(true);
    setError("");

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Connecte-toi pour continuer.");

      const { data: target, error: targetError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.trim().replace(/^@/, ""))
        .maybeSingle();

      if (targetError) throw targetError;
      if (!target) throw new Error("Aucun utilisateur trouvé avec ce pseudo.");
      if (target.id === auth.user.id) {
        throw new Error("Tu ne peux pas démarrer une conversation avec toi-même.");
      }

      const { data: conversationId, error: rpcError } = await supabase.rpc(
        "create_conversation",
        { participant_ids: [auth.user.id, target.id] }
      );

      if (rpcError) throw rpcError;
      if (!conversationId) throw new Error("La conversation n'a pas été créée.");

      setShowNewMessage(false);
      setUsername("");
      router.push(`/messages/${conversationId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création.");
    } finally {
      setCreating(false);
    }
  }

  const filtered = conversations.filter((conv) => {
    const name =
      conv.otherUser.full_name || conv.otherUser.username || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <main className="min-h-[100dvh] bg-moshi-bg pb-24">
      <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-1" aria-label="Retour">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-lg font-bold flex-1">Messagerie</h1>
          <button
            onClick={() => setShowNewMessage((v) => !v)}
            className="p-2 text-moshi-purple"
            aria-label="Nouvelle conversation"
          >
            <Edit3 className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une conversation..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 text-sm outline-none"
            />
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <StoriesBar />
      </div>

      {showNewMessage && (
        <section className="p-4 bg-white border-b space-y-3">
          <h2 className="font-semibold">Nouvelle conversation</h2>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Pseudo du destinataire"
            className="w-full p-3 rounded-xl bg-gray-100 outline-none"
          />
          <button
            onClick={startConversation}
            disabled={creating || !username.trim()}
            className="w-full rounded-xl bg-moshi-purple text-white font-semibold py-3 disabled:opacity-50"
          >
            {creating ? "Création..." : "Démarrer la conversation"}
          </button>
        </section>
      )}

      {error && (
        <p className="mx-4 mt-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
          {error}
        </p>
      )}

      <section className="p-4 max-w-md mx-auto space-y-2">
        {loading ? (
          <p className="text-center py-16 text-sm text-gray-500">
            Chargement des conversations...
          </p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <MessageCircle className="w-12 h-12 text-gray-300" />
            <p className="text-sm text-gray-500">
              Aucune conversation pour le moment.
            </p>
            <button
              onClick={() => setShowNewMessage(true)}
              className="text-sm font-semibold text-moshi-purple"
            >
              Envoyer un premier message
            </button>
          </div>
        ) : (
          filtered.map((conv) => {
            const name =
              conv.otherUser.full_name ||
              conv.otherUser.username ||
              "Utilisateur";

            return (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className="flex items-center gap-3 p-3 bg-white rounded-2xl shadow-sm"
              >
                <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 shrink-0">
                  {conv.otherUser.avatar_url ? (
                    <Image
                      src={conv.otherUser.avatar_url}
                      alt={name}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-moshi-purple">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <p className="font-bold truncate">{name}</p>
                    {conv.unread > 0 && (
                      <span className="rounded-full bg-[#FF4B72] text-white text-xs px-2 py-0.5">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {conv.lastMessage}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </section>
    </main>
  );
}

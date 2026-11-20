
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Edit3,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
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
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [username, setUsername] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

  const loadConversations = useCallback(async () => {
    setError("");

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

      setCurrentUserId(user.id);

      const { data: memberships, error: membershipError } =
        await supabase
          .from("conversation_members")
          .select("conversation_id")
          .eq("user_id", user.id);

      if (membershipError) throw membershipError;

      const conversationIds = [
        ...new Set(
          (memberships ?? []).map((item) => item.conversation_id)
        ),
      ];

      if (conversationIds.length === 0) {
        setConversations([]);
        return;
      }

      const [
        membersResult,
        conversationsResult,
        messagesResult,
      ] = await Promise.all([
        supabase
          .from("conversation_members")
          .select("conversation_id,user_id")
          .in("conversation_id", conversationIds),

        supabase
          .from("conversations")
          .select("id,updated_at")
          .in("id", conversationIds)
          .order("updated_at", { ascending: false }),

        supabase
          .from("messages")
          .select(
            "id,conversation_id,sender_id,receiver_id,content,read,created_at"
          )
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

      if (membersResult.error) throw membersResult.error;
      if (conversationsResult.error) throw conversationsResult.error;
      if (messagesResult.error) throw messagesResult.error;

      const members = membersResult.data ?? [];
      const messageRows = messagesResult.data ?? [];
      const conversationRows = conversationsResult.data ?? [];

      const otherUserIds = [
        ...new Set(
          members
            .filter((member) => member.user_id !== user.id)
            .map((member) => member.user_id)
        ),
      ];

      let profiles: Profile[] = [];

      if (otherUserIds.length > 0) {
        const { data, error: profilesError } = await supabase
          .from("profiles")
          .select("id,username,full_name,avatar_url")
          .in("id", otherUserIds);

        if (profilesError) throw profilesError;

        profiles = (data ?? []) as Profile[];
      }

      const profileMap = new Map(
        profiles.map((profile) => [profile.id, profile])
      );

      const latestMessageByConversation = new Map<
        string,
        (typeof messageRows)[number]
      >();

      const unreadByConversation = new Map<string, number>();

      for (const message of messageRows) {
        if (!latestMessageByConversation.has(message.conversation_id)) {
          latestMessageByConversation.set(
            message.conversation_id,
            message
          );
        }

        if (
          message.receiver_id === user.id &&
          message.read !== true
        ) {
          unreadByConversation.set(
            message.conversation_id,
            (unreadByConversation.get(message.conversation_id) ?? 0) + 1
          );
        }
      }

      const result: Conversation[] = conversationRows.map((conv) => {
        const otherMember = members.find(
          (member) =>
            member.conversation_id === conv.id &&
            member.user_id !== user.id
        );

        const otherId = otherMember?.user_id ?? "";

        const otherUser =
          profileMap.get(otherId) ?? {
            id: otherId,
            username: "Utilisateur",
            full_name: "Utilisateur",
            avatar_url: null,
          };

        const latest = latestMessageByConversation.get(conv.id);

        return {
          id: conv.id,
          updated_at: conv.updated_at,
          otherUser,
          lastMessage:
            latest?.content || "Nouvelle conversation",
          unread: unreadByConversation.get(conv.id) ?? 0,
        };
      });

      setConversations(result);
    } catch (err) {
      console.error("Chargement messagerie :", err);
      setError("Impossible de charger les conversations.");
    }
  }, [router, supabase]);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function initialize() {
      setLoading(true);

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

        setCurrentUserId(user.id);

        await loadConversations();

        if (!active) return;

        channel = supabase
          .channel(`messages-list-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "messages",
            },
            () => {
              if (active) void loadConversations();
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "conversation_members",
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              if (active) void loadConversations();
            }
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "conversations",
            },
            () => {
              if (active) void loadConversations();
            }
          )
          .subscribe();
      } catch (err) {
        console.error("Initialisation messagerie :", err);

        if (active) {
          setError("Impossible d'ouvrir la messagerie.");
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
  }, [loadConversations, router, supabase]);

  async function startConversation() {
    const normalizedUsername = username.trim().replace(/^@/, "");

    if (!normalizedUsername || creating) return;

    setCreating(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Connecte-toi pour continuer.");

      const { data: target, error: targetError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", normalizedUsername)
        .maybeSingle();

      if (targetError) throw targetError;

      if (!target) {
        throw new Error("Aucun utilisateur trouvé avec ce pseudo.");
      }

      if (target.id === user.id) {
        throw new Error(
          "Tu ne peux pas démarrer une conversation avec toi-même."
        );
      }

      // Cherche d'abord une conversation existante entre ces deux personnes.
      const { data: myMemberships, error: myMembershipError } =
        await supabase
          .from("conversation_members")
          .select("conversation_id")
          .eq("user_id", user.id);

      if (myMembershipError) throw myMembershipError;

      const myConversationIds = (myMemberships ?? []).map(
        (item) => item.conversation_id
      );

      if (myConversationIds.length > 0) {
        const { data: targetMemberships, error: targetMembershipError } =
          await supabase
            .from("conversation_members")
            .select("conversation_id")
            .eq("user_id", target.id)
            .in("conversation_id", myConversationIds);

        if (targetMembershipError) throw targetMembershipError;

        const existingConversation = targetMemberships?.[0];

        if (existingConversation) {
          setShowNewMessage(false);
          setUsername("");
          router.push(`/messages/${existingConversation.conversation_id}`);
          return;
        }
      }

      const { data: conversationId, error: rpcError } =
        await supabase.rpc("create_conversation", {
          participant_ids: [user.id, target.id],
        });

      if (rpcError) throw rpcError;

      if (!conversationId) {
        throw new Error("La conversation n'a pas été créée.");
      }

      setShowNewMessage(false);
      setUsername("");

      router.push(`/messages/${conversationId}`);
    } catch (err) {
      console.error("Création conversation :", err);

      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la création de la conversation."
      );
    } finally {
      setCreating(false);
    }
  }

  const filtered = conversations.filter((conv) => {
    const name =
      conv.otherUser.full_name ||
      conv.otherUser.username ||
      "";

    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <main className="min-h-[100dvh] bg-moshi-bg pb-24">
      <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-1" aria-label="Retour">
            <ArrowLeft className="w-6 h-6" />
          </Link>

          <h1 className="text-lg font-bold flex-1">
            Messagerie
          </h1>

          <button
            type="button"
            onClick={() => setShowNewMessage((value) => !value)}
            className="p-2 text-moshi-purple"
            aria-label="Nouvelle conversation"
          >
            <Edit3 className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => void loadConversations()}
            className="p-2 text-gray-500"
            aria-label="Actualiser"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
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
          <h2 className="font-semibold">
            Nouvelle conversation
          </h2>

          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Pseudo du destinataire"
            maxLength={50}
            className="w-full p-3 rounded-xl bg-gray-100 outline-none"
          />

          <button
            type="button"
            onClick={() => void startConversation()}
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

            <p className="text-sm text-gray-500 text-center">
              {search
                ? "Aucune conversation ne correspond à cette recherche."
                : "Aucune conversation pour le moment."}
            </p>

            <button
              type="button"
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
                    <p className="font-bold truncate">
                      {name}
                    </p>

                    {conv.unread > 0 && (
                      <span className="rounded-full bg-[#FF4B72] text-white text-xs px-2 py-0.5">
                        {conv.unread}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-500 truncate">
                    {conv.lastMessage}
                  </p>

                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(conv.updated_at).toLocaleDateString(
                      "fr-FR",
                      {
                        day: "2-digit",
                        month: "short",
                      }
                    )}
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

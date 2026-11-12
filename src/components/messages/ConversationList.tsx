"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { format } from "date-fns"; // Optionnel, sinon on fait une fonction simple

interface Conversation {
  id: string;
  other_user: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  };
  last_message: {
    content: string;
    created_at: string;
  } | null;
  unread_count: number;
}

export default function ConversationList({ userId }: { userId: string }) {
  const supabase = createClient();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = async () => {
    // 1. Récupérer les IDs des conversations de l'utilisateur
    const { data: participations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", userId);

    if (!participations || participations.length === 0) {
      setLoading(false);
      return;
    }

    const convoIds = participations.map((p) => p.conversation_id);

    // 2. Récupérer les détails (autre user + dernier message)
    // Note: C'est une requête simplifiée. En prod, on utiliserait des RPC pour optimiser.
    const { data: convos } = await supabase
      .from("conversations")
      .select(`
        id,
        conversation_participants!inner(user_id),
        messages (content, created_at, sender_id)
      `)
      .in("id", convoIds)
      .order("created_at", { foreignTable: "messages", ascending: false })
      .limit(1, { foreignTable: "messages" });

    // Formatage manuel pour l'exemple (à optimiser avec une vue SQL en prod)
    const formatted: Conversation[] = (convos || []).map((c: any) => {
      const participants = c.conversation_participants.map((p: any) => p.user_id);
      const otherUserId = participants.find((id: string) => id !== userId);
      
      // On doit fetch le profil de l'autre user (simplifié ici)
      return {
        id: c.id,
        other_user: { id: otherUserId, username: "Chargement...", avatar_url: null },
        last_message: c.messages?.[0] || null,
        unread_count: 0,
      };
    });

    // 3. Fetch des profils des autres users
    const otherUserIds = formatted.map((c) => c.other_user.id).filter(Boolean);
    if (otherUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", otherUserIds);
      
      formatted.forEach((c) => {
        const profile = profiles?.find((p) => p.id === c.other_user.id);
        if (profile) c.other_user = profile;
      });
    }

    setConversations(formatted);
    setLoading(false);
  };

  useEffect(() => {
    loadConversations();

    // Écouter les nouveaux messages en temps réel
    const channel = supabase
      .channel("messages-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        loadConversations(); // Recharger la liste
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, supabase]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center mb-4">
          <span className="text-2xl">💬</span>
        </div>
        <p className="text-neutral-400 text-sm">Aucune conversation pour le moment.</p>
        <Link href="/search" className="mt-4 text-red-500 font-semibold text-sm">
          Trouver des créateurs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {conversations.map((convo) => (
        <Link
          key={convo.id}
          href={`/messages/${convo.id}`}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-900 transition-colors"
        >
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0">
            {convo.other_user.avatar_url ? (
              <img src={convo.other_user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-neutral-500">
                {convo.other_user.username?.charAt(0).toUpperCase() || "?"}
              </div>
            )}
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <h3 className="font-semibold text-white truncate">
                {convo.other_user.username || "Utilisateur"}
              </h3>
              {convo.last_message && (
                <span className="text-xs text-neutral-500">
                  {getTimeAgo(convo.last_message.created_at)}
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-400 truncate">
              {convo.last_message?.content || "Dites bonjour ! 👋"}
            </p>
          </div>

          {/* Badge non-lu (optionnel) */}
          {convo.unread_count > 0 && (
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">{convo.unread_count}</span>
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}

function getTimeAgo(dateString: string) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "maintenant";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}j`;
}

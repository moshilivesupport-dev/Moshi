"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { MessageCircle } from "lucide-react";

type Conv = {
  id: string;
  updated_at: string;
  other?: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  last_message?: string;
};

export default function MessagesPage() {
  const supabase = createClient();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: memberships } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user.id);

      const ids = (memberships || []).map((m) => m.conversation_id);
      if (!ids.length) {
        setLoading(false);
        return;
      }

      const { data: conversations } = await supabase
        .from("conversations")
        .select("id, updated_at")
        .in("id", ids)
        .order("updated_at", { ascending: false });

      // Pour chaque conv, trouver l'autre membre (simplifié)
      const result: Conv[] = [];
      for (const c of conversations || []) {
        const { data: members } = await supabase
          .from("conversation_members")
          .select("user_id, profiles:user_id(id, username, full_name, avatar_url)")
          .eq("conversation_id", c.id);

        const other = (members || []).find((m: any) => m.user_id !== user.id);
        result.push({
          id: c.id,
          updated_at: c.updated_at,
          other: other?.profiles as any,
        });
      }

      setConvs(result);
      setLoading(false);
    }
    load();
  }, [supabase]);

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-24">
      <header className="sticky top-0 z-20 bg-black/95 backdrop-blur border-b border-neutral-800 px-4 py-4">
        <h1 className="text-xl font-bold">Messages</h1>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      ) : convs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <MessageCircle className="w-12 h-12 text-neutral-600 mb-4" />
          <p className="text-neutral-400">Aucun message pour le moment</p>
        </div>
      ) : (
        <div className="divide-y divide-neutral-900">
          {convs.map((c) => (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-900/50"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-800 shrink-0">
                {c.other?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.other.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold">
                    {(c.other?.full_name || c.other?.username || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">
                  {c.other?.full_name || c.other?.username || "Conversation"}
                </p>
                <p className="text-xs text-neutral-500">Ouvrir la conversation</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

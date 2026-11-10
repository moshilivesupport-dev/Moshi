"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Plus } from "lucide-react";

type StoryGroup = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  has_unseen: boolean;
};

export default function StoryBar() {
  const supabase = createClient();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setMyId(user?.id ?? null);

      // Stories non expirées, groupées par user
      const { data } = await supabase
        .from("stories")
        .select(
          `
          user_id,
          profiles:user_id (username, full_name, avatar_url)
        `
        )
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      const map = new Map<string, StoryGroup>();
      (data || []).forEach((row: any) => {
        if (map.has(row.user_id)) return;
        map.set(row.user_id, {
          user_id: row.user_id,
          username: row.profiles?.username,
          full_name: row.profiles?.full_name,
          avatar_url: row.profiles?.avatar_url,
          has_unseen: true,
        });
      });
      setGroups(Array.from(map.values()));
    }
    load();
  }, [supabase]);

  return (
    <div className="flex gap-3 overflow-x-auto px-3 py-3 scrollbar-hide border-b border-neutral-900">
      {/* Ajouter ma story */}
      <Link href="/stories/new" className="flex flex-col items-center gap-1 shrink-0">
        <div className="relative w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center border-2 border-dashed border-neutral-600">
          <Plus className="w-6 h-6 text-neutral-400" />
        </div>
        <span className="text-[11px] text-neutral-400">Votre story</span>
      </Link>

      {groups.map((g) => (
        <Link
          key={g.user_id}
          href={`/stories/${g.user_id}`}
          className="flex flex-col items-center gap-1 shrink-0"
        >
          <div
            className={`w-16 h-16 rounded-full p-[2px] ${
              g.has_unseen
                ? "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600"
                : "bg-neutral-700"
            }`}
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-neutral-900 border-2 border-black">
              {g.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold">
                  {(g.full_name || g.username || "?").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <span className="text-[11px] text-neutral-300 max-w-[64px] truncate">
            {g.user_id === myId ? "Vous" : g.username || g.full_name}
          </span>
        </Link>
      ))}
    </div>
  );
}

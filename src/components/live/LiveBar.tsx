"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Plus } from "lucide-react";

interface LiveSession {
  id: string;
  title: string;
  host_id: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export default function LiveBar() {
  const supabase = createClient();
  const [lives, setLives] = useState<LiveSession[]>([]);

  useEffect(() => {
    const loadLives = async () => {
      const { data } = await supabase
        .from("live_sessions")
        .select(`
          id, title, host_id,
          profiles:host_id (username, avatar_url)
        `)
        .eq("status", "live")
        .order("started_at", { ascending: false })
        .limit(10);

      if (data) {
        setLives(data.map((l: any) => ({
          ...l,
          profiles: Array.isArray(l.profiles) ? l.profiles[0] : l.profiles
        })));
      }
    };

    loadLives();

    // Écouter les nouveaux lives en temps réel
    const channel = supabase
      .channel("live-bar-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_sessions" },
        () => loadLives()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide px-4 py-2">
      {/* Bouton "Lancer un live" (visible en premier) */}
      <Link 
        href="/live" 
        className="flex flex-col items-center gap-1 flex-shrink-0"
      >
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-white/50 flex items-center justify-center bg-black/40">
          <Plus className="w-5 h-5 text-white" />
        </div>
        <span className="text-[9px] text-white font-semibold">Lancer</span>
      </Link>

      {/* Liste des lives */}
      {lives.map((live) => (
        <Link
          key={live.id}
          href={`/live/${live.id}`}
          className="flex flex-col items-center gap-1 flex-shrink-0"
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-[#ff2c55] p-0.5">
              <div className="w-full h-full rounded-full overflow-hidden bg-black">
                {live.profiles?.avatar_url ? (
                  <img 
                    src={live.profiles.avatar_url} 
                    alt={live.profiles.username || ""}
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">
                    {(live.profiles?.username?.[0] || "M").toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#ff2c55] text-white text-[7px] font-bold px-1 py-0.5 rounded-full whitespace-nowrap">
              LIVE
            </div>
          </div>
          <span className="text-[9px] text-white font-semibold truncate max-w-[48px]">
            {live.profiles?.username || "user"}
          </span>
        </Link>
      ))}
    </div>
  );
}
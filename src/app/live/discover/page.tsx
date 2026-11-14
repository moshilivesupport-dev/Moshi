"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { X, Radio } from "lucide-react";

interface LiveSession {
  id: string;
  title: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export default function LiveDiscoverPage() {
  const router = useRouter();
  const supabase = createClient();
  const [lives, setLives] = useState<LiveSession[]>([]);

  useEffect(() => {
    const loadLives = async () => {
      const { data } = await supabase
        .from("live_sessions")
        .select(`
          id, title,
          profiles:host_id (username, avatar_url)
        `)
        .eq("status", "live")
        .order("started_at", { ascending: false });

      if (data) {
        setLives(data.map((l: any) => ({
          ...l,
          profiles: Array.isArray(l.profiles) ? l.profiles[0] : l.profiles
        })));
      }
    };
    loadLives();
  }, [supabase]);

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      {/* Header "Découvrir" */}
      <header className="sticky top-0 z-30 bg-black flex items-center justify-between px-4 py-3">
        <div className="w-8" /> {/* Spacer */}
        <h1 className="text-lg font-bold">Découvrir</h1>
        <button onClick={() => router.push("/")} className="p-2">
          <X className="w-6 h-6" />
        </button>
      </header>

      {/* Barre des avatars (Capture 2) */}
      <div className="px-4 py-4">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          {lives.map((live) => (
            <Link
              key={live.id}
              href={`/live/${live.id}`}
              className="flex flex-col items-center gap-2 flex-shrink-0"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
                  <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-neutral-800">
                    {live.profiles?.avatar_url ? (
                      <img src={live.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl font-bold">
                        {(live.profiles?.username?.[0] || "M").toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                {/* Badge LIVE */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                  LIVE
                </div>
              </div>
              <span className="text-xs font-semibold truncate max-w-[80px]">
                {live.profiles?.username || "user"}
              </span>
            </Link>
          ))}

          {lives.length === 0 && (
            <div className="flex flex-col items-center justify-center w-full py-10 text-neutral-500">
              <Radio className="w-10 h-10 mb-2" />
              <p className="text-sm">Aucun live en cours.</p>
            </div>
          )}
        </div>
      </div>

      {/* Tu peux ajouter ici la grille des lives comme sur la capture 2 */}
      <div className="px-4 mt-6">
        <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3">
          Lives en cours
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {lives.map((live) => (
            <Link
              key={live.id}
              href={`/live/${live.id}`}
              className="relative aspect-[9/16] rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800"
            >
              {live.profiles?.avatar_url ? (
                <img src={live.profiles.avatar_url} alt="" className="w-full h-full object-cover opacity-50" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                  <Radio className="w-12 h-12 text-neutral-700" />
                </div>
              )}
              <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                LIVE
              </div>
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-sm font-bold truncate">{live.title}</p>
                <p className="text-xs text-neutral-400">@{live.profiles?.username || "user"}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Radio, Loader2, ArrowLeft, Users, PlayCircle } from "lucide-react";

interface Live {
  id: string;
  title: string;
  viewer_count: number;
  profiles: {
    username: string | null;
    avatar_url: string | null;
    full_name: string | null;
  } | null;
}

export default function LiveDiscoverPage() {
  const supabase = createClient();
  const [lives, setLives] = useState<Live[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLives = async () => {
      const { data } = await supabase
        .from("lives")
        .select("id, title, viewer_count, host_id")
        .eq("status", "live")
        .order("created_at", { ascending: false });

      if (data) {
        const hostIds = [...new Set(data.map(l => l.host_id))];
        const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url, full_name").in("id", hostIds);
        
        const profilesMap: Record<string, any> = {};
        (profiles || []).forEach(p => { profilesMap[p.id] = p; });

        setLives(data.map(l => ({ ...l, profiles: profilesMap[l.host_id] })));
      }
      setLoading(false);
    };
    loadLives();
  }, [supabase]);

  return (
    <div className="min-h-[100dvh] bg-moshi-bg pb-24">
      
      <header className="bg-white shadow-sm sticky top-0 z-20 px-4 py-4 flex items-center gap-3">
        <Link href="/" className="p-1"><ArrowLeft className="w-6 h-6" /></Link>
        <h1 className="text-lg font-bold flex-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Lives en cours
        </h1>
        <Link href="/live/start" className="bg-red-50 text-red-500 text-xs font-bold px-3 py-2 rounded-full flex items-center gap-1">
          <Radio size={14} /> Lancer
        </Link>
      </header>

      <div className="p-4 max-w-md mx-auto">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-moshi-purple animate-spin" /></div>
        ) : lives.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <PlayCircle className="w-12 h-12 text-gray-300" />
            <p className="text-sm text-gray-500">Aucun live en cours.</p>
            <Link href="/live/start">
              <button className="moshi-gradient text-white font-bold px-6 py-3 rounded-full text-sm">
                Lancer le premier live
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {lives.map((live) => {
              const hostName = live.profiles?.full_name || live.profiles?.username || "Host";
              return (
                <Link href={`/live/${live.id}`} key={live.id} className="relative aspect-[9/16] bg-gray-900 rounded-2xl overflow-hidden shadow-sm">
                  {/* Image de fond (avatar de l'hôte en grand) */}
                  {live.profiles?.avatar_url ? (
                    <Image src={live.profiles.avatar_url} alt={hostName} fill className="object-cover opacity-60" unoptimized />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-moshi-purple to-moshi-pink opacity-80" />
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    <span className="bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                    </span>
                    <span className="bg-black/50 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
                      <Users size={10} /> {live.viewer_count}
                    </span>
                  </div>

                  {/* Infos en bas */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full overflow-hidden border border-white">
                        {live.profiles?.avatar_url ? (
                          <Image src={live.profiles.avatar_url} alt={hostName} width={24} height={24} className="w-full h-full object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full bg-moshi-purple flex items-center justify-center text-[8px] font-bold text-white">{hostName.charAt(0)}</div>
                        )}
                      </div>
                      <p className="text-white text-[10px] font-bold truncate">{hostName}</p>
                    </div>
                    <p className="text-white text-xs font-semibold line-clamp-2 leading-tight">{live.title}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
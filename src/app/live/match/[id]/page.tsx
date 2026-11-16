"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { X, Eye, Heart, Gift, Send, Smile, Crown, Trophy, MoreHorizontal } from "lucide-react";

export default function LiveMatchPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [live, setLive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([
    { id: "1", name: "Dijena", text: "Maya le feu 🔥", avatar: "https://i.pravatar.cc/150?img=1" },
    { id: "2", name: "Sarah", text: "Go Maya 💪", avatar: "https://i.pravatar.cc/150?img=2" },
    { id: "3", name: "Amina Style", text: "Kevin tu vas perdre 😂", avatar: "https://i.pravatar.cc/150?img=3" },
  ]);

  useEffect(() => {
    const loadLive = async () => {
      const { data } = await supabase.from("lives").select("*").eq("id", id).single();
      if (data) {
        const { data: hostProfile } = await supabase.from("profiles").select("username, full_name, avatar_url").eq("id", data.host_id).single();
        const { data: opponentProfile } = data.opponent_id ? await supabase.from("profiles").select("username, full_name, avatar_url").eq("id", data.opponent_id).single() : { data: null };
        
        setLive({ ...data, host: hostProfile, opponent: opponentProfile });
      }
      setLoading(false);
    };
    if (id) loadLive();
  }, [id, supabase]);

  if (loading) return <div className="min-h-[100dvh] bg-black flex items-center justify-center"><div className="w-10 h-10 border-4 border-moshi-purple border-t-transparent rounded-full animate-spin" /></div>;
  if (!live) return <div className="min-h-[100dvh] bg-black flex items-center justify-center text-white">Match introuvable</div>;

  const hostName = live.host?.full_name || live.host?.username || "Host";
  const opponentName = live.opponent?.full_name || live.opponent?.username || "Opponent";

  return (
    <div className="h-[100dvh] w-full bg-black relative overflow-hidden flex flex-col">
      
      {/* ZONE DES DEUX VIDÉOS (Split Screen) */}
      <div className="absolute inset-0 flex">
        <div className="w-1/2 relative border-r-2 border-white/20">
          <Image
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=500&auto=format&fit=crop"
            alt="Host"
            fill
            className="object-cover"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-32 left-2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full">
            <p className="text-white text-xs font-bold">{hostName}</p>
          </div>
          <div className="absolute top-32 left-2 bg-moshi-pink text-white text-[9px] font-bold px-2 py-0.5 rounded-full">Hôte</div>
        </div>
        
        <div className="w-1/2 relative">
          <Image
            src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=500&auto=format&fit=crop"
            alt="Opponent"
            fill
            className="object-cover"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-32 right-2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full">
            <p className="text-white text-xs font-bold">{opponentName}</p>
          </div>
          <div className="absolute top-32 right-2 bg-blue-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">Invité</div>
        </div>
      </div>

      {/* VS CENTRAL ET COURONNE */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
        <div className="relative">
          <Crown className="w-12 h-12 text-yellow-400 fill-yellow-400 absolute -top-8 left-1/2 -translate-x-1/2 drop-shadow-lg animate-bounce" />
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-1 rounded-full border-4 border-white shadow-2xl">
            <div className="bg-black px-4 py-2 rounded-full">
              <span className="text-white font-extrabold text-2xl italic">VS</span>
            </div>
          </div>
        </div>
      </div>

      {/* HEADER (Logo, Scores, Stats) */}
      <header className="relative z-20 p-4 pt-safe">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg moshi-gradient flex items-center justify-center text-white font-extrabold text-lg">M</div>
            <span className="text-white font-bold text-xl">moshi</span>
            <div className="ml-2 bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
              <Trophy size={12} className="text-yellow-300" />
              <span className="text-white text-[10px] font-bold">Match</span>
            </div>
          </div>
          <button onClick={() => router.push("/")} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white">
            <X size={20} />
          </button>
        </div>

        {/* Top Donateurs + Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-white/80 text-[10px] font-semibold">Top 3 donateurs</p>
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-7 h-7 rounded-full border-2 border-purple-500 overflow-hidden">
                  <Image src={`https://i.pravatar.cc/150?img=${i+10}`} alt="Donateur" width={28} height={28} className="w-full h-full object-cover" unoptimized />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 text-white text-xs font-bold">
              <Eye size={14} /> {live.viewer_count || 8500}
            </div>
            <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 text-white text-xs font-bold">
              <Heart size={14} className="fill-red-500 text-red-500" /> 124.7K
            </div>
          </div>
        </div>

        {/* JAUGES DE SCORE */}
        <div className="mt-4 flex h-8 rounded-full overflow-hidden border-2 border-white/20 shadow-lg">
          <div className="bg-gradient-to-r from-pink-500 to-red-500 flex items-center justify-start px-3" style={{ width: "55%" }}>
            <Gift size={14} className="text-white mr-1" />
            <span className="text-white text-xs font-bold">{live.team_a_score || "152.3K"}</span>
          </div>
          <div className="bg-gradient-to-l from-blue-500 to-cyan-500 flex items-center justify-end px-3 flex-1">
            <span className="text-white text-xs font-bold">{live.team_b_score || "137.5K"}</span>
            <Gift size={14} className="text-white ml-1" />
          </div>
        </div>

        {/* CHRONO */}
        <div className="mt-2 flex justify-center">
          <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 text-white text-xs font-bold border border-white/20">
            ⏱️ 00:12
          </div>
        </div>
      </header>

      <div className="flex-1" />

      {/* CHAT OVERLAY (en bas à gauche) */}
      <div className="relative z-20 px-4 space-y-2 mb-4 max-h-[30vh] overflow-y-auto scrollbar-hide">
        {messages.map((m) => (
          <div key={m.id} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 shrink-0">
              <Image src={m.avatar} alt={m.name} width={32} height={32} className="w-full h-full object-cover" unoptimized />
            </div>
            <div className="bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-2xl rounded-bl-sm">
              <p className="text-white text-[10px] font-bold">{m.name}</p>
              <p className="text-white text-xs">{m.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* BANNIÈRE VAINQUEUR / LEADER */}
      <div className="relative z-20 px-4 mb-3 flex justify-center">
        <div className="bg-purple-600/80 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 border border-purple-400">
          <Trophy size={14} className="text-yellow-300" />
          <p className="text-white text-xs font-bold">L'Équipe Rose mène avec 210.5K cadeaux !</p>
        </div>
      </div>

      {/* INPUT CHAT + BOUTONS */}
      <div className="relative z-20 px-4 pb-safe pb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2.5 flex items-center gap-2">
            <Smile size={18} className="text-white/60" />
            <input
              type="text"
              placeholder="Discuter avec les équipes..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm placeholder:text-white/50 outline-none"
            />
            <Send size={16} className="text-white" />
          </div>
          <button className="w-11 h-11 rounded-full moshi-gradient flex items-center justify-center text-white shadow-lg">
            <Gift size={22} />
          </button>
        </div>
        <div className="flex justify-center gap-4">
          <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white">
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
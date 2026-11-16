"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import {
  X, Eye, Heart, ShoppingBag, ChevronRight, Mic,
  Camera, UserPlus, Gift, MoreHorizontal, Send, Smile
} from "lucide-react";
import { cn } from "@/lib/utils";

// Import dynamique pour éviter les erreurs SSR
const LiveKitRoomComponent = dynamic(() => import("@/components/live/LiveKitRoom"), { ssr: false });

export default function LiveRoomPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [live, setLive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [userName, setUserName] = useState("Viewer");
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([
    { id: "1", name: "Maya", text: "C'est incroyable ! 😍", avatar: "https://i.pravatar.cc/150?img=1" },
    { id: "2", name: "Sarah", text: "Je l'adore 😍", avatar: "https://i.pravatar.cc/150?img=2" },
  ]);

  // Cœurs animés
  const [hearts, setHearts] = useState<{ id: number; left: number }[]>([]);
  useEffect(() => {
    const interval = setInterval(() => {
      setHearts(prev => [...prev, { id: Date.now(), left: Math.random() * 80 + 10 }]);
    }, 800);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (hearts.length > 10) setHearts(hearts.slice(-10));
  }, [hearts]);

  useEffect(() => {
    const loadLive = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data } = await supabase.from("lives").select("*, product:products(*)").eq("id", id).single();
      if (data) {
        const { data: profile } = await supabase.from("profiles").select("username, full_name, avatar_url").eq("id", data.host_id).single();
        setLive({ ...data, profiles: profile });
        setIsHost(user?.id === data.host_id);
        setUserName(profile?.username || profile?.full_name || "Viewer");
      }
      setLoading(false);
    };
    if (id) loadLive();
  }, [id, supabase]);

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    setMessages([...messages, { id: Date.now().toString(), name: "Vous", text: chatMessage, avatar: null }]);
    setChatMessage("");
  };

  if (loading) return <div className="min-h-[100dvh] bg-black flex items-center justify-center"><div className="w-10 h-10 border-4 border-moshi-purple border-t-transparent rounded-full animate-spin" /></div>;
  if (!live) return <div className="min-h-[100dvh] bg-black flex items-center justify-center text-white">Live introuvable</div>;

  const hostName = live.profiles?.full_name || live.profiles?.username || "Hôte";

  return (
    <div className="h-[100dvh] w-full bg-black relative overflow-hidden flex flex-col">
      
      {/* LE VRAI COMPOSANT LIVEKIT */}
      <LiveKitRoomComponent 
        roomName={`live-${live.id}`} 
        participantName={userName} 
        isHost={isHost} 
      />

      {/* OVERLAY POUR L'UI */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none z-20" />

      {/* HEADER */}
      <header className="relative z-30 p-4 pt-safe pointer-events-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg moshi-gradient flex items-center justify-center text-white font-extrabold text-lg">M</div>
            <span className="text-white font-bold text-xl">moshi</span>
          </div>

          {isHost ? (
            <button onClick={() => router.push("/")} className="bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
              <span className="w-3 h-3 bg-white rounded-sm" /> Terminer live
            </button>
          ) : (
            <button onClick={() => router.push("/")} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white bg-gray-800 relative">
              {live.profiles?.avatar_url ? (
                <Image src={live.profiles.avatar_url} alt={hostName} fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold">{hostName.charAt(0)}</div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <p className="text-white text-sm font-bold">{hostName}</p>
                <span className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">✓</span>
              </div>
              <p className="text-white/70 text-[10px]">12.8K J'aime</p>
            </div>
            {!isHost && (
              <button className="ml-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
                + Suivre
              </button>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-1.5">
            <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 text-white text-xs font-bold border border-white/10">
              <Eye size={14} /> {live.viewer_count || 1200}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1" />

      {/* CŒURS */}
      <div className="absolute right-4 bottom-48 z-20 pointer-events-none w-24 h-64 overflow-hidden">
        {hearts.map((h) => (
          <div key={h.id} className="absolute text-pink-500 animate-float-up opacity-80" style={{ left: `${h.left}%`, bottom: 0 }}>
            <Heart className="w-6 h-6 fill-pink-500" />
          </div>
        ))}
      </div>

      {/* CHAT */}
      <div className="relative z-20 px-4 space-y-2 mb-2 max-h-[30vh] overflow-y-auto scrollbar-hide pointer-events-auto">
        {messages.slice(-4).map((m) => (
          <div key={m.id} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-700 shrink-0">
              {m.avatar ? (
                <Image src={m.avatar} alt={m.name} width={28} height={28} className="w-full h-full object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-[10px]">{m.name.charAt(0)}</div>
              )}
            </div>
            <div className="bg-black/30 backdrop-blur-sm px-3 py-1 rounded-2xl rounded-bl-sm">
              <p className="text-white text-[10px] font-bold">{m.name}</p>
              <p className="text-white text-xs">{m.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* PRODUIT ÉPINGLÉ */}
      {live.product && (
        <div className="relative z-20 px-4 mb-2 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-2 flex items-center gap-3 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
              {live.product.image_url ? (
                <Image src={live.product.image_url} alt={live.product.title} width={48} height={48} className="w-full h-full object-cover" unoptimized />
              ) : (
                <ShoppingBag className="m-auto text-gray-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-red-500 font-bold mb-0.5">Produit épinglé</p>
              <p className="text-xs font-bold text-gray-900 truncate">{live.product.title}</p>
              <p className="text-sm font-extrabold text-moshi-purple">{live.product.price.toLocaleString()} FCFA</p>
            </div>
            <button className="moshi-gradient text-white px-3 py-2 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
              <ShoppingBag size={14} /> Acheter
            </button>
            <ChevronRight size={16} className="text-gray-400 mr-1" />
          </div>
        </div>
      )}

      {/* INPUT CHAT */}
      <div className="relative z-20 px-4 mb-3 pointer-events-auto">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3 py-2 flex items-center gap-2">
            <Smile size={18} className="text-white/60" />
            <input
              type="text"
              placeholder="Discuter avec le streamer..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1 bg-transparent text-white text-sm placeholder:text-white/50 outline-none"
            />
            <button onClick={handleSendMessage} className="text-white"><Send size={16} /></button>
          </div>
          <button className="w-10 h-10 rounded-full moshi-gradient flex items-center justify-center text-white shadow-lg">
            <Gift size={20} />
          </button>
        </div>
      </div>

      {/* ACTIONS BAS */}
      <div className="relative z-20 flex items-center justify-around px-6 pb-safe pb-4 pointer-events-auto">
        <button className="flex flex-col items-center gap-1 text-white/80">
          <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"><Mic size={20} /></div>
          <span className="text-[9px] font-semibold">Micro</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-white/80">
          <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"><Camera size={20} /></div>
          <span className="text-[9px] font-semibold">Caméra</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-white/80">
          <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"><UserPlus size={20} /></div>
          <span className="text-[9px] font-semibold">Inviter</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-white/80">
          <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"><MoreHorizontal size={20} /></div>
          <span className="text-[9px] font-semibold">Plus</span>
        </button>
      </div>
    </div>
  );
}
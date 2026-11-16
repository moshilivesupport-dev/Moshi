"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import {
  X, Eye, Heart, ShoppingBag, Mic, Camera, UserPlus,
  Gift, MoreHorizontal, Send, Smile, Crown, Coins, Music
} from "lucide-react";
import { cn, getFlag } from "@/lib/utils";
import GiftPanel from "@/components/live/GiftPanel";
import GiftAnimation from "@/components/live/GiftAnimation";
import Soundboard from "@/components/live/Soundboard";

const LiveKitRoomComponent = dynamic(() => import("@/components/live/LiveKitRoom"), { ssr: false });

interface HeartParticle {
  id: number;
  x: number;
  y: number;
  color: string;
}

interface ChatMessage {
  id: string;
  name: string;
  text: string;
  avatar: string | null;
  isGift?: boolean;
  isJoin?: boolean;
}

interface Gift {
  id: string;
  name: string;
  icon: string;
  price: number;
}

export default function LiveRoomPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [live, setLive] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userName, setUserName] = useState("Viewer");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [topDonors, setTopDonors] = useState<any[]>([]);
  const [hearts, setHearts] = useState<HeartParticle[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  
  const [walletBalance, setWalletBalance] = useState(0);
  const [isGiftPanelOpen, setIsGiftPanelOpen] = useState(false);
  const [isSoundboardOpen, setIsSoundboardOpen] = useState(false);
  const [activeGiftAnimation, setActiveGiftAnimation] = useState<{ icon: string; name: string; senderName: string } | null>(null);

  const handleScreenTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("a")) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const colors = ["#FF8FB1", "#9D7BEA", "#60A5FA", "#FF4B72"];
    const newHeart: HeartParticle = {
      id: Date.now() + Math.random(),
      x, y,
      color: colors[Math.floor(Math.random() * colors.length)],
    };

    setHearts((prev) => [...prev, newHeart]);
    setLikeCount((prev) => prev + 1);

    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== newHeart.id));
    }, 2000);
  };

  useEffect(() => {
    const loadLive = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      
      if (user) {
        const { data: userProfile } = await supabase.from("profiles").select("username, full_name, avatar_url").eq("id", user.id).single();
        const name = userProfile?.username || userProfile?.full_name || "Viewer";
        setUserName(name);
        setUserAvatar(userProfile?.avatar_url || null);

        const { data: wallet } = await supabase.from("wallets").select("balance").eq("user_id", user.id).single();
        if (wallet) {
          setWalletBalance(wallet.balance);
        } else {
          await supabase.from("wallets").insert({ user_id: user.id, balance: 1000 });
          setWalletBalance(1000);
        }
      }
      
      const { data } = await supabase.from("lives").select("*, product:products(*)").eq("id", id).single();
      if (data) {
        if (data.status === "ended") {
          router.push("/");
          return;
        }
        const { data: profile } = await supabase.from("profiles").select("username, full_name, avatar_url, country").eq("id", data.host_id).single();
        setLive({ ...data, profiles: profile });
        setIsHost(user?.id === data.host_id);
        setLikeCount(data.like_count || 0);

        const { data: giftsData } = await supabase.from("live_gifts").select("sender_id, total_price").eq("live_id", id);
        if (giftsData && giftsData.length > 0) {
          const donorTotals: Record<string, number> = {};
          giftsData.forEach(g => {
            donorTotals[g.sender_id] = (donorTotals[g.sender_id] || 0) + g.total_price;
          });
          const topIds = Object.entries(donorTotals).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id);
          if (topIds.length > 0) {
            const { data: donors } = await supabase.from("profiles").select("id, username, avatar_url, full_name").in("id", topIds);
            setTopDonors(donors || []);
          }
        }
      }
      setLoading(false);
    };
    if (id) loadLive();
  }, [id, supabase, router]);

  useEffect(() => {
    if (!id || !userName) return;
    
    const channel = supabase.channel(`live-chat-${id}`, {
      config: { broadcast: { self: false } }
    }).on("broadcast", { event: "message" }, (payload) => {
      setMessages((prev) => [...prev, payload.payload as ChatMessage]);
    }).on("broadcast", { event: "join" }, (payload) => {
      setMessages((prev) => [...prev, { 
        id: Date.now().toString(), 
        name: payload.payload.name, 
        text: "a rejoint le live", 
        avatar: payload.payload.avatar,
        isJoin: true 
      }]);
    }).subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({
          type: "broadcast",
          event: "join",
          payload: { name: userName, avatar: userAvatar }
        });
      }
    });

    return () => { supabase.removeChannel(channel); };
  }, [id, supabase, userName, userAvatar]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    const newMsg = { id: Date.now().toString(), name: userName, text: chatMessage, avatar: userAvatar };
    setMessages([...messages, newMsg]);
    supabase.channel(`live-chat-${id}`).send({ type: "broadcast", event: "message", payload: newMsg });
    setChatMessage("");
  };

  const handleSendGift = async (gift: Gift) => {
    if (!currentUser || !live) return;
    if (walletBalance < gift.price) {
      alert("Solde insuffisant ! Recharge ton portefeuille.");
      return;
    }

    try {
      await supabase.from("live_gifts").insert({
        live_id: live.id, gift_id: gift.id, sender_id: currentUser.id,
        recipient_id: live.host_id, quantity: 1, total_price: gift.price,
      });

      await supabase.from("wallets").update({ balance: walletBalance - gift.price }).eq("user_id", currentUser.id);
      setWalletBalance(walletBalance - gift.price);

      setActiveGiftAnimation({ icon: gift.icon, name: gift.name, senderName: userName });

      const giftMessage = {
        id: Date.now().toString(), name: userName,
        text: `a envoyé ${gift.icon} ${gift.name} !`,
        avatar: userAvatar, isGift: true,
      };
      setMessages((prev) => [...prev, giftMessage]);
      supabase.channel(`live-chat-${id}`).send({ type: "broadcast", event: "message", payload: giftMessage });
    } catch (err: any) {
      alert("Erreur envoi cadeau : " + err.message);
    }
  };

  const handleEndLive = async () => {
    await supabase.from("lives").update({ status: "ended" }).eq("id", live.id);
    router.push("/");
  };

  if (loading) return <div className="min-h-[100dvh] bg-black flex items-center justify-center"><div className="w-10 h-10 border-4 border-moshi-purple border-t-transparent rounded-full animate-spin" /></div>;
  if (!live) return <div className="min-h-[100dvh] bg-black flex items-center justify-center text-white">Live introuvable</div>;

  const hostName = live.profiles?.full_name || live.profiles?.username || "Hôte";

  return (
    <div className="h-[100dvh] w-full bg-black relative overflow-hidden flex flex-col" onClick={handleScreenTap}>
      
      <LiveKitRoomComponent roomName={`live-${live.id}`} participantName={userName} isHost={isHost} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none z-20" />

      <GiftAnimation gift={activeGiftAnimation} onComplete={() => setActiveGiftAnimation(null)} />

      <header className="relative z-40 p-4 pt-safe pointer-events-none">
        <div className="flex items-center justify-between mb-4 pointer-events-auto">
          <div className="flex items-center gap-2">
            <Image src="/brand/moshi-logo.jpg" alt="Moshi" width={100} height={30} className="h-8 w-auto object-contain" priority />
          </div>
          {isHost ? (
            <button onClick={handleEndLive} className="bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
              <span className="w-3 h-3 bg-white rounded-sm" /> Terminer live
            </button>
          ) : (
            <button onClick={() => router.push("/")} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="flex items-start justify-between pointer-events-auto relative z-40">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white bg-gray-800 relative shrink-0">
              {live.profiles?.avatar_url ? (
                <Image src={live.profiles.avatar_url} alt={hostName} fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold">{hostName.charAt(0)}</div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <p className="text-white text-sm font-bold">{hostName}</p>
                {live.profiles?.country && <span className="text-sm">{getFlag(live.profiles.country)}</span>}
                <span className="w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">✓</span>
              </div>
              <p className="text-white/70 text-[10px]">{likeCount.toLocaleString()} J'aime</p>
            </div>
            {!isHost && (
              <button className="ml-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
                + Suivre
              </button>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 text-white text-xs font-bold border border-white/10">
              <Eye size={14} /> {live.viewer_count || 1}
            </div>
          </div>
        </div>

        {topDonors.length > 0 && (
          <div className="mt-3 flex items-center gap-2 bg-black/20 w-fit px-3 py-1.5 rounded-full backdrop-blur-sm pointer-events-auto relative z-40">
            <p className="text-white/80 text-[10px] font-semibold">👑 Top donateurs</p>
            <div className="flex -space-x-2">
              {topDonors.map((d, i) => (
                <div key={d.id} className="relative w-6 h-6 rounded-full border border-white overflow-hidden">
                  {d.avatar_url ? (
                    <Image src={d.avatar_url} alt={d.username} width={24} height={24} className="w-full h-full object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full bg-moshi-purple flex items-center justify-center text-[8px] font-bold text-white">{d.username?.charAt(0)}</div>
                  )}
                  {i === 0 && <Crown size={10} className="absolute -top-2 left-1/2 -translate-x-1/2 text-yellow-400 fill-yellow-400" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      <div className="flex-1 pointer-events-none" />

      <div className="absolute inset-0 z-25 pointer-events-none overflow-hidden">
        {hearts.map((h) => (
          <div key={h.id} className="absolute" style={{ left: h.x, top: h.y }}>
            <Heart className="w-8 h-8 animate-float-heart" style={{ fill: h.color, color: h.color, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }} />
          </div>
        ))}
      </div>

      <div className="relative z-30 px-4 space-y-1.5 mb-2 max-h-[20vh] overflow-y-auto scrollbar-hide pointer-events-auto">
        {messages.slice(-3).map((m) => (
          <div key={m.id} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-700 shrink-0">
              {m.avatar ? (
                <Image src={m.avatar} alt={m.name} width={24} height={24} className="w-full h-full object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-[8px] font-bold">{m.name.charAt(0)}</div>
              )}
            </div>
            <div className={cn("px-2.5 py-1 rounded-2xl rounded-bl-sm", m.isGift ? "bg-gradient-to-r from-pink-500 to-purple-500" : m.isJoin ? "bg-purple-500/40" : "bg-black/30 backdrop-blur-sm")}>
              <p className="text-white text-[9px] font-bold">{m.name}</p>
              <p className="text-white text-[11px]">{m.text}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {live.product && (
        <div className="relative z-30 px-4 mb-2 pointer-events-auto">
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
          </div>
        </div>
      )}

      <div className="relative z-40 px-4 mb-3 pointer-events-auto">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-3 py-2 flex items-center gap-2 max-w-[75%]">
            <Smile size={16} className="text-white/60 shrink-0" />
            <input
              type="text"
              placeholder="Discuter..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1 bg-transparent text-white text-sm placeholder:text-white/50 outline-none min-w-0"
            />
            <button onClick={handleSendMessage} className="text-white shrink-0"><Send size={14} /></button>
          </div>

          <button onClick={() => setIsGiftPanelOpen(true)} className="flex flex-col items-center gap-0.5 shrink-0">
            <div className="w-10 h-10 rounded-full moshi-gradient flex items-center justify-center text-white shadow-lg">
              <Gift size={18} />
            </div>
            <div className="flex items-center gap-0.5 bg-yellow-500/20 px-1.5 py-0.5 rounded-full">
              <Coins size={8} className="text-yellow-400" />
              <span className="text-yellow-400 text-[9px] font-bold">{walletBalance}</span>
            </div>
          </button>
        </div>
      </div>

      <div className="relative z-40 flex items-center justify-around px-4 pb-safe pb-4 pointer-events-auto">
        <button className="flex flex-col items-center gap-1 text-white/80">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"><Mic size={18} /></div>
          <span className="text-[9px] font-semibold">Micro</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-white/80">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"><Camera size={18} /></div>
          <span className="text-[9px] font-semibold">Caméra</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-white/80">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"><UserPlus size={18} /></div>
          <span className="text-[9px] font-semibold">Inviter</span>
        </button>
        <button onClick={() => setIsSoundboardOpen(true)} className="flex flex-col items-center gap-1 text-white/80">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"><Music size={18} /></div>
          <span className="text-[9px] font-semibold">Sons</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-white/80">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center"><MoreHorizontal size={18} /></div>
          <span className="text-[9px] font-semibold">Plus</span>
        </button>
      </div>

      <GiftPanel isOpen={isGiftPanelOpen} onClose={() => setIsGiftPanelOpen(false)} onSendGift={handleSendGift} />
      <Soundboard isOpen={isSoundboardOpen} onClose={() => setIsSoundboardOpen(false)} />
    </div>
  );
}
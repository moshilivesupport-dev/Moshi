"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Radio, Users, Gift, ShoppingBag, X, Coins } from "lucide-react";
import LiveChat from "./LiveChat";
import LiveProductPin from "./LiveProductPin";
import GiftPanel from "./GiftPanel";
import GiftAnimation from "./GiftAnimation";
import TopDonors from "./TopDonors";
import CoinShop from "@/components/coins/CoinShop";

interface LiveRoomProps {
  sessionId: string;
  isHost?: boolean;
  session?: any;
  token?: string;
  serverUrl?: string;
}

export default function LiveRoom({ sessionId, isHost = false, session: initialSession, token, serverUrl }: LiveRoomProps) {
  const supabase = createClient();
  const [session, setSession] = useState<any>(initialSession);
  const [viewers, setViewers] = useState(0);
  const [pinnedProduct, setPinnedProduct] = useState<any>(null);
  const [giftPanelOpen, setGiftPanelOpen] = useState(false);
  const [coinShopOpen, setCoinShopOpen] = useState(false);
  const [coinBalance, setCoinBalance] = useState(0);
  const [activeGift, setActiveGift] = useState<any>(null);
  const [giftCombo, setGiftCombo] = useState<Record<string, { count: number; timer: NodeJS.Timeout }>>({});

  // Charger le solde de coins
  useEffect(() => {
    const loadBalance = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("user_coins").select("balance").eq("user_id", user.id).single();
      if (data) setCoinBalance(data.balance || 0);
    };
    loadBalance();
  }, [supabase]);

  // Charger les métadonnées du live
  useEffect(() => {
    if (session) return;
    supabase
      .from("live_sessions")
      .select(`*, profiles:host_id (id, username, full_name, avatar_url)`)
      .eq("id", sessionId)
      .single()
      .then(({ data }) => setSession(data));
  }, [sessionId, session, supabase]);

  // Écouter les événements en temps réel
  useEffect(() => {
    const channel = supabase
      .channel(`live-room-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_sessions", filter: `id=eq.${sessionId}` },
        (payload: any) => { // ✅ CORRECTION ICI : ajout de ": any"
          setViewers(payload.new.viewers_count || 0);
          if (payload.new.pinned_product_id) {
            setPinnedProduct({ id: "1", name: "Produit Démo", price: 29.99, image_url: "https://picsum.photos/100", stock: 15 });
          } else {
            setPinnedProduct(null);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_gifts", filter: `session_id=eq.${sessionId}` },
        async (payload: any) => { // ✅ CORRECTION ICI : ajout de ": any"
          const gift = payload.new;
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", gift.sender_id)
            .single();

          const comboKey = `${gift.sender_id}-${gift.gift_type}`;
          if (giftCombo[comboKey]) {
            clearTimeout(giftCombo[comboKey].timer);
            const newCount = giftCombo[comboKey].count + 1;
            setGiftCombo(prev => ({
              ...prev,
              [comboKey]: {
                count: newCount,
                timer: setTimeout(() => {
                  setGiftCombo(prev => {
                    const next = { ...prev };
                    delete next[comboKey];
                    return next;
                  });
                }, 3000)
              }
            }));
            setActiveGift({ ...gift, sender_name: profile?.username, sender_avatar: profile?.avatar_url, combo: newCount });
          } else {
            setGiftCombo(prev => ({
              ...prev,
              [comboKey]: {
                count: 1,
                timer: setTimeout(() => {
                  setGiftCombo(prev => {
                    const next = { ...prev };
                    delete next[comboKey];
                    return next;
                  });
                }, 3000)
              }
            }));
            setActiveGift({ ...gift, sender_name: profile?.username, sender_avatar: profile?.avatar_url, combo: 1 });
          }

          setTimeout(() => setActiveGift(null), 4000);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, supabase, giftCombo]);

  if (!session) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] bg-black text-white overflow-hidden">
      {/* Zone vidéo (placeholder ou LiveKit) */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-900 via-black to-neutral-900">
        <div className="text-center p-6">
          <Radio className="w-20 h-20 text-red-500 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-bold mb-2">
            {isHost ? "Vous êtes en live" : "Live en cours"}
          </h2>
          <p className="text-sm text-neutral-400">
            Room: {session.room_name || sessionId}
          </p>
        </div>
      </div>

      {/* Dégradés */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent z-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />

      {/* Badge LIVE + Spectateurs */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-red-600 px-3 py-1.5 rounded-lg shadow-lg">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-xs font-black tracking-wider">LIVE</span>
        </div>
        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <Users className="w-3.5 h-3.5 text-neutral-300" />
          <span className="text-xs font-bold">{viewers || session.viewers_count || 0}</span>
        </div>
        {/* Solde de coins */}
        <button
          onClick={() => setCoinShopOpen(true)}
          className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-yellow-500/30 hover:bg-black/60 transition"
        >
          <Coins className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-xs font-bold text-yellow-500">{coinBalance}</span>
        </button>
      </div>

      {/* Top Donors */}
      <TopDonors sessionId={sessionId} />

      {/* Info du Host */}
      <div className="absolute top-16 left-4 z-30 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden bg-neutral-800">
          {session.profiles?.avatar_url ? (
            <img src={session.profiles.avatar_url} alt="Host" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-sm">
              {session.profiles?.username?.charAt(0).toUpperCase() || "H"}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-bold text-white drop-shadow-md">
            {session.profiles?.username || session.profiles?.full_name || "Vendeur"}
          </p>
          <p className="text-xs text-neutral-300">{session.title || "Live Shopping"}</p>
        </div>
      </div>

      {/* Bouton fermer */}
      <button
        onClick={() => window.history.back()}
        className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-black/60 transition"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Boutons d'action droite */}
      <div className="absolute bottom-24 right-4 z-30 flex flex-col gap-3">
        <button
          onClick={() => setGiftPanelOpen(true)}
          className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition"
        >
          <Gift className="w-6 h-6 text-pink-500" />
        </button>
        {isHost && (
          <button
            onClick={() => {/* Logique pour épingler un produit */}}
            className="w-12 h-12 rounded-full bg-red-500/90 backdrop-blur-md flex items-center justify-center active:scale-90 transition shadow-lg shadow-red-500/20"
          >
            <ShoppingBag className="w-6 h-6 text-white" />
          </button>
        )}
      </div>

      {/* Chat */}
      <LiveChat sessionId={sessionId} />

      {/* Produit épinglé */}
      <LiveProductPin product={pinnedProduct} onClose={() => setPinnedProduct(null)} />

      {/* Animation de cadeau */}
      <GiftAnimation activeGift={activeGift} />

      {/* Panneau de cadeaux */}
      <GiftPanel
        sessionId={sessionId}
        receiverId={session.host_id}
        isOpen={giftPanelOpen}
        onClose={() => setGiftPanelOpen(false)}
      />

      {/* Boutique de coins */}
      <CoinShop
        isOpen={coinShopOpen}
        onClose={() => setCoinShopOpen(false)}
        currentBalance={coinBalance}
        onBalanceUpdate={setCoinBalance}
      />
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Radio, Users, Gift, ShoppingBag, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LiveChat from "./LiveChat";
import LiveProductPin from "./LiveProductPin";
import GiftPanel from "./GiftPanel";

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
  const [activeGift, setActiveGift] = useState<any>(null);

  // Charger les métadonnées du live si pas fournies
  useEffect(() => {
    if (session) return;
    supabase
      .from("live_sessions")
      .select(`
        *,
        profiles:host_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq("id", sessionId)
      .single()
      .then(({ data }) => setSession(data));
  }, [sessionId, session, supabase]);

  // Écouter les mises à jour en temps réel
  useEffect(() => {
    const channel = supabase
      .channel(`live-room-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          setViewers(payload.new.viewers_count || 0);
          if (payload.new.pinned_product_id) {
            // Fetch du produit épinglé
            setPinnedProduct({ id: "1", name: "Produit Démo", price: 29.99, image_url: "https://picsum.photos/100", stock: 15 });
          } else {
            setPinnedProduct(null);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_gifts", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          // Afficher l'animation du cadeau
          setActiveGift(payload.new);
          setTimeout(() => setActiveGift(null), 3000); // Disparait après 3s
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, supabase]);

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

      {/* Dégradés pour lisibilité */}
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
      </div>

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

      {/* Bouton fermer (pour retourner à la liste) */}
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

      {/* Chat en temps réel */}
      <LiveChat sessionId={sessionId} />

      {/* Produit épinglé */}
      <LiveProductPin product={pinnedProduct} onClose={() => setPinnedProduct(null)} />

      {/* Animation de cadeau en plein écran */}
      <AnimatePresence>
        {activeGift && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none"
          >
            <div className="text-9xl">{getGiftEmoji(activeGift.gift_type)}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panneau de cadeaux */}
      <GiftPanel
        sessionId={sessionId}
        receiverId={session.host_id}
        isOpen={giftPanelOpen}
        onClose={() => setGiftPanelOpen(false)}
      />
    </div>
  );
}

// Helper pour obtenir l'emoji du cadeau
function getGiftEmoji(giftType: string): string {
  const gifts: Record<string, string> = {
    rose: "🌹",
    heart: "❤️",
    kiss: "💋",
    fire: "🔥",
    star: "⭐",
    lion: "🦁",
    rocket: "🚀",
    universe: "🌌",
  };
  return gifts[giftType] || "🎁";
}

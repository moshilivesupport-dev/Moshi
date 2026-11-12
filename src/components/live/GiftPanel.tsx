"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Coins } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Gift {
  id: string;
  name: string;
  emoji: string;
  coin_cost: number;
  animation: string; // 'float', 'explode', 'rainbow'
}

interface GiftPanelProps {
  sessionId: string;
  receiverId: string;
  isOpen: boolean;
  onClose: () => void;
}

// Catalogue des cadeaux disponibles
const GIFT_CATALOG: Gift[] = [
  { id: "rose", name: "Rose", emoji: "🌹", coin_cost: 1, animation: "float" },
  { id: "heart", name: "Cœur", emoji: "❤️", coin_cost: 5, animation: "float" },
  { id: "kiss", name: "Bisou", emoji: "💋", coin_cost: 10, animation: "float" },
  { id: "fire", name: "Feu", emoji: "🔥", coin_cost: 50, animation: "explode" },
  { id: "star", name: "Étoile", emoji: "⭐", coin_cost: 100, animation: "rainbow" },
  { id: "lion", name: "Lion", emoji: "🦁", coin_cost: 500, animation: "explode" },
  { id: "rocket", name: "Fusée", emoji: "🚀", coin_cost: 1000, animation: "rainbow" },
  { id: "universe", name: "Univers", emoji: "🌌", coin_cost: 5000, animation: "rainbow" },
];

export default function GiftPanel({ sessionId, receiverId, isOpen, onClose }: GiftPanelProps) {
  const supabase = createClient();
  const [coinBalance, setCoinBalance] = useState(0);
  const [sending, setSending] = useState<string | null>(null);

  // Charger le solde de coins de l'utilisateur
  useEffect(() => {
    const loadBalance = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_coins")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      if (data) setCoinBalance(data.balance || 0);
    };
    loadBalance();
  }, [supabase]);

  const sendGift = async (gift: Gift) => {
    if (coinBalance < gift.coin_cost) {
      alert(`Vous n'avez pas assez de coins. Il vous faut ${gift.coin_cost} coins.`);
      return;
    }

    setSending(gift.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Insérer le cadeau
      const { error } = await supabase.from("live_gifts").insert({
        session_id: sessionId,
        sender_id: user.id,
        receiver_id: receiverId,
        gift_type: gift.id,
        coin_cost: gift.coin_cost,
      });

      if (error) throw error;

      // Déduire les coins du sender
      await supabase
        .from("user_coins")
        .update({ balance: coinBalance - gift.coin_cost })
        .eq("user_id", user.id);

      setCoinBalance((prev) => prev - gift.coin_cost);

      // TODO: Déclencher l'animation du cadeau sur l'écran
      // triggerGiftAnimation(gift);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi du cadeau");
    } finally {
      setSending(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay sombre */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Panneau de cadeaux */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-neutral-900 rounded-t-3xl border-t border-neutral-800 max-h-[70vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-bold text-white">
                  {coinBalance.toLocaleString("fr-FR")} coins
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 transition"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Grille des cadeaux */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="grid grid-cols-4 gap-3">
                {GIFT_CATALOG.map((gift) => {
                  const canAfford = coinBalance >= gift.coin_cost;
                  const isSending = sending === gift.id;

                  return (
                    <button
                      key={gift.id}
                      onClick={() => sendGift(gift)}
                      disabled={!canAfford || isSending}
                      className={`relative aspect-square rounded-2xl border-2 transition-all ${
                        canAfford
                          ? "border-neutral-700 hover:border-red-500 hover:scale-105 active:scale-95"
                          : "border-neutral-800 opacity-50 cursor-not-allowed"
                      } ${isSending ? "animate-pulse border-red-500" : ""}`}
                    >
                      {/* Emoji du cadeau */}
                      <div className="text-4xl mb-1">{gift.emoji}</div>

                      {/* Nom du cadeau */}
                      <p className="text-xs font-semibold text-white truncate px-1">
                        {gift.name}
                      </p>

                      {/* Coût en coins */}
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <Coins className="w-3 h-3 text-yellow-500" />
                        <span className="text-xs font-bold text-yellow-500">
                          {gift.coin_cost}
                        </span>
                      </div>

                      {/* Badge "Populaire" pour les cadeaux chers */}
                      {gift.coin_cost >= 500 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 px-1.5 py-0.5 rounded text-[9px] font-bold text-white">
                          HOT
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer avec bouton recharger */}
            <div className="px-4 py-3 border-t border-neutral-800">
              <button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-98 transition">
                <Coins className="w-4 h-4" />
                Recharger mes coins
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

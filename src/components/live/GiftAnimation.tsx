"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface GiftAnimationData {
  id: string;
  sender_name: string;
  sender_avatar: string | null;
  gift_type: string;
  coin_cost: number;
  combo?: number;
}

interface GiftAnimationProps {
  activeGift: GiftAnimationData | null;
}

const GIFT_CONFIG: Record<string, { emoji: string; scale: number; color: string; effect: string }> = {
  rose: { emoji: "🌹", scale: 1, color: "from-red-500 to-pink-500", effect: "float" },
  heart: { emoji: "❤️", scale: 1.2, color: "from-red-500 to-red-600", effect: "float" },
  kiss: { emoji: "💋", scale: 1.3, color: "from-pink-500 to-rose-500", effect: "float" },
  fire: { emoji: "🔥", scale: 1.5, color: "from-orange-500 to-red-600", effect: "explode" },
  star: { emoji: "⭐", scale: 1.8, color: "from-yellow-400 to-amber-500", effect: "rainbow" },
  lion: { emoji: "🦁", scale: 2, color: "from-amber-500 to-orange-600", effect: "explode" },
  rocket: { emoji: "🚀", scale: 2.2, color: "from-blue-500 to-purple-600", effect: "rainbow" },
  universe: { emoji: "🌌", scale: 2.5, color: "from-purple-600 via-pink-500 to-blue-600", effect: "rainbow" },
};

export default function GiftAnimation({ activeGift }: GiftAnimationProps) {
  const [particles, setParticles] = useState<number[]>([]);

  useEffect(() => {
    if (!activeGift) {
      setParticles([]);
      return;
    }

    const config = GIFT_CONFIG[activeGift.gift_type];
    const particleCount = config.effect === "rainbow" ? 30 : config.effect === "explode" ? 20 : 0;
    
    setParticles(Array.from({ length: particleCount }, (_, i) => i));
  }, [activeGift]);

  if (!activeGift) return null;

  const config = GIFT_CONFIG[activeGift.gift_type] || GIFT_CONFIG.rose;

  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
      {/* Particules d'arrière-plan */}
      <AnimatePresence>
        {particles.map((i) => (
          <motion.div
            key={`${activeGift.id}-${i}`}
            initial={{
              x: "50%",
              y: "50%",
              scale: 0,
              opacity: 1,
            }}
            animate={{
              x: `${Math.random() * 100}%`,
              y: `${Math.random() * 100}%`,
              scale: Math.random() * 1.5 + 0.5,
              opacity: 0,
              rotate: Math.random() * 360,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute text-2xl"
          >
            {config.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Cadeau principal */}
      <motion.div
        key={activeGift.id}
        initial={{ scale: 0, opacity: 0, y: 100 }}
        animate={{ scale: config.scale, opacity: 1, y: 0 }}
        exit={{ scale: 3, opacity: 0, y: -200 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
      >
        {/* Halo lumineux */}
        <div className={`absolute inset-0 bg-gradient-to-r ${config.color} blur-3xl opacity-40 animate-pulse rounded-full`} />
        
        {/* Emoji du cadeau */}
        <div className="relative text-9xl drop-shadow-2xl">
          {config.emoji}
        </div>

        {/* Combo */}
        {activeGift.combo && activeGift.combo > 1 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mt-2 bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-1 rounded-full"
          >
            <span className="text-white font-black text-xl">x{activeGift.combo}</span>
          </motion.div>
        )}
      </motion.div>

      {/* Bandeau sender en bas */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ delay: 0.2 }}
        className="absolute bottom-32 left-4 right-4 z-50"
      >
        <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0 border-2 border-yellow-500">
            {activeGift.sender_avatar ? (
              <img src={activeGift.sender_avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-sm">
                {activeGift.sender_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">
              {activeGift.sender_name}
            </p>
            <p className="text-xs text-yellow-500 font-semibold">
              a envoyé un {config.emoji} {getGiftName(activeGift.gift_type)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-400">Coût</p>
            <p className="text-sm font-bold text-yellow-500">
              {activeGift.coin_cost.toLocaleString("fr-FR")} 🪙
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function getGiftName(giftType: string): string {
  const names: Record<string, string> = {
    rose: "Rose",
    heart: "Cœur",
    kiss: "Bisou",
    fire: "Feu",
    star: "Étoile",
    lion: "Lion",
    rocket: "Fusée",
    universe: "Univers",
  };
  return names[giftType] || "Cadeau";
}

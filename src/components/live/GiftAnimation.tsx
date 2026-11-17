"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface GiftAnimationProps {
  gift: {
    id?: string;
    icon: string;
    name: string;
    senderName: string;
    quantity?: number;
  } | null;
  onComplete: () => void;
}

export default function GiftAnimation({
  gift,
  onComplete,
}: GiftAnimationProps) {
  useEffect(() => {
    if (!gift) return;

    const timer = window.setTimeout(onComplete, 5200);
    return () => window.clearTimeout(timer);
  }, [gift, onComplete]);

  return (
    <AnimatePresence>
      {gift && (
        <motion.div
          key={gift.id || `${gift.name}-${gift.senderName}`}
          initial={{ opacity: 0, scale: 0.5, y: 80 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: -60 }}
          transition={{ type: "spring", stiffness: 150, damping: 14 }}
          className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center"
        >
          <div className="relative flex flex-col items-center">
            <motion.div
              animate={{ rotate: [0, -8, 8, -5, 5, 0], scale: [1, 1.12, 1] }}
              transition={{ duration: 1.2, repeat: 2 }}
              className="absolute h-64 w-64 rounded-full bg-purple-500/20 blur-3xl"
            />

            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute h-56 w-56 rounded-full border border-dashed border-pink-300/40"
            />

            <motion.div
              animate={{ scale: [0.9, 1.12, 0.95, 1] }}
              transition={{ duration: 1.5, repeat: 2 }}
              className="relative flex h-40 w-40 items-center justify-center rounded-full border border-white/30 bg-gradient-to-br from-pink-500/30 via-purple-600/50 to-indigo-500/30 shadow-[0_0_70px_rgba(168,85,247,0.65)] backdrop-blur-xl"
            >
              <span className="text-8xl drop-shadow-[0_8px_20px_rgba(0,0,0,0.5)]">
                {gift.icon}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-5 rounded-2xl border border-white/20 bg-black/75 px-6 py-4 text-center shadow-2xl backdrop-blur-xl"
            >
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-pink-300">
                Cadeau Moshi
              </p>

              <h2 className="mt-1 text-2xl font-black text-white">
                {gift.name}
              </h2>

              {(gift.quantity ?? 1) > 1 && (
                <p className="mt-1 text-lg font-black text-yellow-300">
                  × {gift.quantity}
                </p>
              )}

              <p className="mt-2 text-sm text-white/80">
                Envoyé par{" "}
                <span className="font-bold text-pink-300">
                  {gift.senderName}
                </span>
              </p>
            </motion.div>

            {Array.from({ length: 12 }).map((_, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0.5, 1.5, 0.3],
                  x: Math.cos((index * Math.PI) / 6) * 150,
                  y: Math.sin((index * Math.PI) / 6) * 150,
                }}
                transition={{ duration: 1.8, delay: 0.2, repeat: 1 }}
                className="absolute text-xl"
              >
                {["✨", "💜", "⭐", "💖"][index % 4]}
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
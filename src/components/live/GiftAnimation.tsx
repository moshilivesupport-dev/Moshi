
"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface GiftAnimationProps {
  gift: {
    icon: string;
    name: string;
    senderName: string;
    eventId?: string;
  } | null;
  onComplete?: () => void;
}

export default function GiftAnimation({
  gift,
  onComplete,
}: GiftAnimationProps) {
  useEffect(() => {
    if (!gift) return;

    const timer = window.setTimeout(() => {
      onComplete?.();
    }, 6500);

    return () => window.clearTimeout(timer);
  }, [gift?.eventId, onComplete]);

  return (
    <AnimatePresence mode="wait">
      {gift && (
        <motion.div
          key={gift.eventId || `${gift.name}-${gift.senderName}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden pointer-events-none"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.72 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-[#10051F]"
          />

          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute h-[340px] w-[340px] rounded-full bg-gradient-to-r from-pink-500/30 via-purple-500/40 to-blue-500/30 blur-[60px]"
          />

          <div className="relative flex flex-col items-center">
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{
                scale: [0, 1.35, 1, 1.08, 1],
                rotate: [ -30, 15, -8, 0 ],
                y: [50, -15, 0, -8, 0],
              }}
              transition={{
                duration: 1.5,
                ease: "easeOut",
              }}
              className="relative z-10 text-[125px] leading-none drop-shadow-[0_0_35px_rgba(255,120,200,0.9)]"
            >
              {gift.icon}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.7, duration: 0.7 }}
              className="mt-8 rounded-3xl border border-white/20 bg-black/40 px-8 py-5 text-center backdrop-blur-xl"
            >
              <p className="text-sm font-semibold text-white/70">
                <span className="text-pink-300">
                  {gift.senderName}
                </span>{" "}
                a envoyé un cadeau
              </p>

              <h2 className="mt-2 text-3xl font-black text-white drop-shadow-lg">
                {gift.name}
              </h2>

              <p className="mt-2 text-xs font-bold tracking-[0.3em] text-pink-300">
                MOSHI LIVE
              </p>
            </motion.div>

            {[...Array(12)].map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;

              return (
                <motion.div
                  key={i}
                  initial={{
                    scale: 0,
                    opacity: 1,
                    x: 0,
                    y: 0,
                  }}
                  animate={{
                    scale: [0, 1.3, 0],
                    opacity: [1, 1, 0],
                    x: Math.cos(angle) * 190,
                    y: Math.sin(angle) * 190,
                  }}
                  transition={{
                    duration: 2,
                    delay: 0.4,
                    ease: "easeOut",
                  }}
                  className="absolute text-2xl"
                >
                  {i % 2 === 0 ? "✨" : "💖"}
                </motion.div>
              );
            })}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.5, 1] }}
              transition={{
                duration: 2,
                repeat: 2,
                delay: 1,
              }}
              className="mt-5 text-sm font-bold text-yellow-300"
            >
              ✨ Merci pour ce cadeau !
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

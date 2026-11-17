
"use client";

import { motion, AnimatePresence } from "framer-motion";

interface GiftAnimationProps {
  gift: {
    icon: string;
    name: string;
    senderName: string;
    category?: string;
  } | null;
  onComplete?: () => void;
}

export default function GiftAnimation({
  gift,
  onComplete,
}: GiftAnimationProps) {
  const category = gift?.category || "standard";

  const settings = {
    standard: { duration: 4, scale: 1.3 },
    premium: { duration: 7, scale: 1.7 },
    exclusif: { duration: 12, scale: 2 },
  };

  const config =
    settings[category as keyof typeof settings] || settings.standard;

  return (
    <AnimatePresence>
      {gift && (
        <motion.div
          key={`${gift.name}-${gift.senderName}-${category}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          onAnimationComplete={() => {}}
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.78 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-black"
          />

          {/* Lumière Moshi */}
          <motion.div
            animate={{ rotate: 360, scale: [0.9, 1.2, 0.9] }}
            transition={{
              rotate: { duration: 8, repeat: Infinity, ease: "linear" },
              scale: { duration: 3, repeat: Infinity },
            }}
            className="absolute w-[300px] h-[300px] rounded-full bg-gradient-to-r from-pink-500/40 via-purple-500/40 to-blue-500/40 blur-[70px]"
          />

          {/* Particules */}
          {Array.from({ length: 16 }).map((_, i) => {
            const angle = (i * 360) / 16;
            const distance = 130 + (i % 3) * 45;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  x: Math.cos((angle * Math.PI) / 180) * distance,
                  y: Math.sin((angle * Math.PI) / 180) * distance,
                }}
                transition={{
                  duration: 2.5,
                  delay: 0.3,
                  repeat: Infinity,
                  repeatDelay: 1,
                }}
                className="absolute text-2xl"
              >
                {i % 2 === 0 ? "✨" : "💫"}
              </motion.div>
            );
          })}

          {/* Cadeau */}
          <div className="relative flex flex-col items-center">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{
                scale: [0, config.scale, config.scale * 0.9, config.scale],
                rotate: [0, 15, -15, 0],
                y: [40, -20, 0, -10, 0],
              }}
              transition={{
                duration: 2,
                ease: "easeOut",
              }}
              className="text-[110px] sm:text-[140px] drop-shadow-[0_0_35px_rgba(255,105,180,0.8)]"
            >
              {gift.icon}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.7 }}
              className="mt-8 text-center"
            >
              <p className="text-white text-lg font-bold">
                <span className="text-pink-400">
                  {gift.senderName}
                </span>{" "}
                a envoyé
              </p>

              <p className="text-yellow-400 text-3xl font-black mt-2 drop-shadow-lg">
                {gift.name}
              </p>

              <div className="mt-3 mx-auto w-fit px-5 py-1.5 rounded-full border border-pink-400/40 bg-pink-500/20">
                <span className="text-white text-[10px] font-bold tracking-[3px]">
                  MOSHI LIVE
                </span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

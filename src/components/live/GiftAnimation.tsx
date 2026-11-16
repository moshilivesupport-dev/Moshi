"use client";

import { motion, AnimatePresence } from "framer-motion";

interface GiftAnimationProps {
  gift: { icon: string; name: string; senderName: string } | null;
  onComplete?: () => void;
}

export default function GiftAnimation({ gift, onComplete }: GiftAnimationProps) {
  return (
    <AnimatePresence>
      {gift && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onAnimationComplete={onComplete}
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
        >
          {/* Overlay sombre */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black"
          />

          {/* Contenu */}
          <div className="relative flex flex-col items-center">
            
            {/* Rayons lumineux (effet rotation) */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute w-64 h-64 rounded-full bg-gradient-to-r from-pink-500/40 via-purple-500/40 to-blue-500/40 blur-2xl"
            />

            {/* Le cadeau */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: [0, 1.5, 1.2, 1.4, 1.2], 
                rotate: [0, 360, 0],
                y: [0, -20, 0, -10, 0]
              }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="text-[120px] drop-shadow-[0_0_30px_rgba(255,143,177,0.8)]"
            >
              {gift.icon}
            </motion.div>

            {/* Texte */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-4 text-center"
            >
              <p className="text-white text-lg font-bold drop-shadow-md">
                <span className="text-pink-400">{gift.senderName}</span> a envoyé
              </p>
              <p className="text-yellow-400 text-2xl font-extrabold drop-shadow-md">
                {gift.name} !
              </p>
            </motion.div>

            {/* Particules qui explosent */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, x: 0, y: 0 }}
                animate={{
                  scale: [0, 1, 0],
                  x: Math.cos((i * 60) * Math.PI / 180) * 150,
                  y: Math.sin((i * 60) * Math.PI / 180) * 150,
                }}
                transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
                className="absolute text-4xl"
              >
                ✨
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
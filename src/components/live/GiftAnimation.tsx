"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

interface GiftAnimationProps {
  gift: { emoji: string; name: string } | null;
  onComplete: () => void;
}

export default function GiftAnimation({ gift, onComplete }: GiftAnimationProps) {
  useEffect(() => {
    if (gift) {
      const timer = setTimeout(onComplete, 3000);
      return () => clearTimeout(timer);
    }
  }, [gift, onComplete]);

  return (
    <AnimatePresence>
      {gift && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 100 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.5, y: -100 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="fixed bottom-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[80] flex flex-col items-center pointer-events-none"
        >
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: 2 }}
            className="text-[120px] drop-shadow-2xl"
          >
            {gift.emoji}
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white text-xl font-bold mt-2 drop-shadow-lg"
          >
            {gift.name} !
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
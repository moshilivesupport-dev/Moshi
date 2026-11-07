"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export interface GiftEvent {
  id: string;
  icon: string;
  name: string;
  sender: string;
  quantity?: number;
}

interface Props {
  gifts: GiftEvent[];
  onDone?: (id: string) => void;
}

export function GiftOverlay({ gifts, onDone }: Props) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      <AnimatePresence>
        {gifts.map((gift, idx) => (
          <motion.div
            key={gift.id}
            initial={{ opacity: 0, y: 40, scale: 0.5, x: Math.random() * 60 - 30 }}
            animate={{ opacity: 1, y: -80 - idx * 20, scale: 1.2 }}
            exit={{ opacity: 0, y: -160 }}
            transition={{ duration: 2.2, ease: "easeOut" }}
            onAnimationComplete={() => onDone?.(gift.id)}
            className="absolute bottom-32 left-1/2 -translate-x-1/2 flex flex-col items-center"
          >
            <span className="text-5xl drop-shadow-lg">{gift.icon}</span>
            <div className="mt-1 px-3 py-1 bg-black/60 backdrop-blur rounded-full text-xs text-white flex items-center gap-1.5">
              <span className="text-champagne font-semibold">{gift.sender}</span>
              <span>a envoyé</span>
              <span className="font-bold text-coral">{gift.name}</span>
              {gift.quantity && gift.quantity > 1 && (
                <span className="text-gold">x{gift.quantity}</span>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Music, Volume2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Sons de base intégrés (en attendant ta bibliothèque)
const BASE_SOUNDS = [
  { id: "1", name: "Applaudissements", emoji: "👏", file_url: "https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3", category: "soundboard" },
  { id: "2", name: "Trompettes", emoji: "🎺", file_url: "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3", category: "soundboard" },
  { id: "3", name: "Rires", emoji: "😂", file_url: "https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3", category: "soundboard" },
  { id: "4", name: "Suspense", emoji: "🎵", file_url: "https://assets.mixkit.co/active_storage/sfx/2016/2016-preview.mp3", category: "soundboard" },
  { id: "5", name: "Victoire", emoji: "🏆", file_url: "https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3", category: "soundboard" },
  { id: "6", name: "Magie", emoji: "✨", file_url: "https://assets.mixkit.co/active_storage/sfx/2015/2015-preview.mp3", category: "soundboard" },
  { id: "7", name: "Cadeau Reçu", emoji: "🎁", file_url: "https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3", category: "system" },
  { id: "8", name: "Cœur Pop", emoji: "❤️", file_url: "https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3", category: "system" },
  { id: "9", name: "Bienvenue", emoji: "👋", file_url: "https://assets.mixkit.co/active_storage/sfx/2021/2021-preview.mp3", category: "system" },
];

interface SoundboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Soundboard({ isOpen, onClose }: SoundboardProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [sounds, setSounds] = useState(BASE_SOUNDS);

  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio();
    }
  }, []);

  const playSound = (url: string) => {
    if (!audioRef.current) return;
    audioRef.current.src = url;
    audioRef.current.volume = 0.6;
    audioRef.current.play().catch(e => console.log("Audio error:", e));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-[#1a0b2e] rounded-t-[32px] max-h-[60dvh] flex flex-col overflow-hidden"
          >
            <div className="p-4 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2 text-white font-bold">
                <Volume2 size={20} className="text-moshi-purple" />
                Soundboard Moshi
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-3 gap-3">
                {sounds.filter(s => s.category === "soundboard").map((sound) => (
                  <button
                    key={sound.id}
                    onClick={() => playSound(sound.file_url)}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 active:scale-95 transition"
                  >
                    <span className="text-3xl">{sound.emoji}</span>
                    <span className="text-white text-[10px] font-semibold text-center">{sound.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
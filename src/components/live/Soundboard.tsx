
"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Sound {
  id: string;
  name: string;
  emoji: string;
  file: string;
  category: string;
}

interface SoundboardProps {
  isOpen: boolean;
  onClose: () => void;
  liveId: string;
}

const SOUNDS: Sound[] = [
  {
    id: "applause",
    name: "Applaudissements",
    emoji: "👏",
    file: "/sounds/applause.mp3",
    category: "Ambiance",
  },
  {
    id: "victory",
    name: "Victoire",
    emoji: "🏆",
    file: "/sounds/victory.mp3",
    category: "Ambiance",
  },
  {
    id: "laugh",
    name: "Rires",
    emoji: "😂",
    file: "/sounds/laugh.mp3",
    category: "Ambiance",
  },
  {
    id: "suspense",
    name: "Suspense",
    emoji: "🎭",
    file: "/sounds/suspense.mp3",
    category: "Ambiance",
  },
  {
    id: "magic",
    name: "Magie",
    emoji: "✨",
    file: "/sounds/magic.mp3",
    category: "Ambiance",
  },
  {
    id: "trumpet",
    name: "Trompettes",
    emoji: "🎺",
    file: "/sounds/trumpet.mp3",
    category: "Ambiance",
  },
];

export default function Soundboard({
  isOpen,
  onClose,
  liveId,
}: SoundboardProps) {
  const supabaseRef = useRef(createClient());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);

  const playSound = async (soundId: string) => {
    const sound = SOUNDS.find((s) => s.id === soundId);
    if (!sound) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.src = sound.file;
      audio.volume = 0.75;
      await audio.play();
      unlockedRef.current = true;
    } catch (error) {
      console.error("Impossible de jouer le son:", error);
    }
  };

  useEffect(() => {
    if (!liveId) return;

    const channel = supabaseRef.current
      .channel(`live-sounds-${liveId}`, {
        config: {
          broadcast: { self: false },
        },
      })
      .on("broadcast", { event: "play_sound" }, (payload) => {
        const soundId = payload.payload?.soundId;

        if (typeof soundId === "string") {
          void playSound(soundId);
        }
      })
      .subscribe();

    return () => {
      void supabaseRef.current.removeChannel(channel);
    };
  }, [liveId]);

  const handleSound = async (sound: Sound) => {
    // Lecture locale immédiate.
    await playSound(sound.id);

    // Diffusion aux autres participants.
    const channel = supabaseRef.current.channel(
      `live-sounds-${liveId}`
    );

    await channel.send({
      type: "broadcast",
      event: "play_sound",
      payload: {
        soundId: sound.id,
        sentAt: Date.now(),
      },
    });
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 26,
              stiffness: 220,
            }}
            className="fixed bottom-0 left-0 right-0 z-[70] max-h-[65dvh] overflow-hidden rounded-t-[30px] border border-white/10 bg-[#160D25] pb-safe"
          >
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">
                  <Volume2 className="text-purple-300" />
                </div>

                <div>
                  <h2 className="font-bold text-white">
                    Soundboard Moshi
                  </h2>
                  <p className="text-[10px] text-white/50">
                    Sons partagés avec les participants
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-white/40">
                Ambiance
              </p>

              <div className="grid grid-cols-3 gap-3">
                {SOUNDS.map((sound) => (
                  <button
                    key={sound.id}
                    onClick={() => handleSound(sound)}
                    className="flex min-h-[105px] flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] p-3 transition active:scale-95 active:bg-purple-500/20"
                  >
                    <span className="text-3xl">
                      {sound.emoji}
                    </span>

                    <span className="text-center text-[10px] font-semibold text-white">
                      {sound.name}
                    </span>
                  </button>
                ))}
              </div>

              <p className="mt-4 text-center text-[10px] text-white/35">
                Les sons sont diffusés aux participants du live.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

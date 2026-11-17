
"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface SoundboardProps {
  isOpen: boolean;
  onClose: () => void;
  liveId: string;
}

const SOUNDS = [
  { id: "applause", name: "Applaudissements", emoji: "👏", file: "/sounds/applause.mp3" },
  { id: "laugh", name: "Rires", emoji: "😂", file: "/sounds/laugh.mp3" },
  { id: "trumpet", name: "Trompettes", emoji: "🎺", file: "/sounds/trumpet.mp3" },
  { id: "victory", name: "Victoire", emoji: "🏆", file: "/sounds/victory.mp3" },
  { id: "magic", name: "Magie", emoji: "✨", file: "/sounds/magic.mp3" },
  { id: "suspense", name: "Suspense", emoji: "🎵", file: "/sounds/suspense.mp3" },
];

export default function Soundboard({
  isOpen,
  onClose,
  liveId,
}: SoundboardProps) {
  const supabase = createClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const channelRef = useRef<any>(null);
  const [connected, setConnected] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);

  const playSound = async (soundId: string) => {
    const sound = SOUNDS.find((s) => s.id === soundId);
    if (!sound) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    const audio = new Audio(sound.file);
    audio.volume = 0.75;
    audioRef.current = audio;
    setPlaying(soundId);

    audio.onended = () => setPlaying(null);
    audio.onerror = () => setPlaying(null);

    try {
      await audio.play();
    } catch (error) {
      console.error("Impossible de jouer le son :", error);
      setPlaying(null);
    }
  };

  useEffect(() => {
    if (!liveId) return;

    const channel = supabase.channel(`live-sounds-${liveId}`, {
      config: { broadcast: { self: false } },
    });

    channelRef.current = channel;

    channel
      .on("broadcast", { event: "play_sound" }, ({ payload }) => {
        if (payload?.soundId) {
          void playSound(payload.soundId);
        }
      })
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      setConnected(false);
      channelRef.current = null;
      supabase.removeChannel(channel);
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [liveId, supabase]);

  const broadcastSound = async (soundId: string) => {
    if (!connected || !channelRef.current) return;

    // Lecture immédiate sur l'appareil de l'expéditeur.
    void playSound(soundId);

    // Diffusion à tous les autres participants.
    const { error } = await channelRef.current.send({
      type: "broadcast",
      event: "play_sound",
      payload: { soundId },
    });

    if (error) {
      console.error("Erreur de diffusion sonore :", error);
    }
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-[#100d1b] rounded-t-[30px] max-h-[65dvh] flex flex-col overflow-hidden border-t border-white/10"
          >
            <div className="p-5 flex items-center justify-between border-b border-white/10">
              <div>
                <div className="flex items-center gap-2 text-white font-bold">
                  <Volume2 size={21} className="text-pink-400" />
                  Soundboard Moshi
                </div>
                <p className="text-white/50 text-xs mt-1">
                  {connected ? "Connecté au live" : "Connexion au live..."}
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 grid grid-cols-3 gap-3 overflow-y-auto">
              {SOUNDS.map((sound) => (
                <button
                  key={sound.id}
                  disabled={!connected}
                  onClick={() => broadcastSound(sound.id)}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition active:scale-95 disabled:opacity-40 ${
                    playing === sound.id
                      ? "bg-pink-500/20 border-pink-400"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <span className="text-4xl">{sound.emoji}</span>
                  <span className="text-white text-[10px] font-semibold text-center">
                    {sound.name}
                  </span>
                  {playing === sound.id && (
                    <span className="text-pink-400 text-[9px] font-bold">
                      EN COURS
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

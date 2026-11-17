"use client";

import { useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Music, Volume2 } from "lucide-react";

interface SoundboardProps {
  isOpen: boolean;
  onClose: () => void;
  liveId: string;
}

const SOUNDS = [
  { id: "applause", name: "Applaudissements", emoji: "👏", file: "/sounds/applause.mp3" },
  { id: "trompette", name: "Trompette", emoji: "🎺", file: "/sounds/trompette.mp3" },
  { id: "rire", name: "Rires", emoji: "😂", file: "/sounds/rire.mp3" },
  { id: "suspense", name: "Suspense", emoji: "😱", file: "/sounds/suspense.mp3" },
  { id: "victoire", name: "Victoire", emoji: "🏆", file: "/sounds/victoire.mp3" },
  { id: "magie", name: "Magie", emoji: "✨", file: "/sounds/magie.mp3" },
];

export default function Soundboard({
  isOpen,
  onClose,
  liveId,
}: SoundboardProps) {
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<any>(null);
  const audioUnlockedRef = useRef(false);

  const playSoundLocally = async (soundId: string) => {
    const sound = SOUNDS.find((item) => item.id === soundId);
    if (!sound) return;

    try {
      const audio = new Audio(sound.file);
      audio.volume = 0.75;
      await audio.play();
    } catch (error) {
      console.warn("Lecture du son impossible :", error);
    }
  };

  useEffect(() => {
    if (!liveId) return;

    const channel = supabase
      .channel(`live-sounds-${liveId}`, {
        config: {
          broadcast: { self: false },
        },
      })
      .on("broadcast", { event: "play-sound" }, ({ payload }) => {
        if (payload?.soundId) {
          void playSoundLocally(payload.soundId);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [liveId, supabase]);

  const unlockAudio = () => {
    audioUnlockedRef.current = true;
  };

  const handlePlaySound = async (soundId: string) => {
    unlockAudio();

    // Le son est joué immédiatement chez la personne qui clique.
    await playSoundLocally(soundId);

    // Les autres participants reçoivent l'événement.
    await channelRef.current?.send({
      type: "broadcast",
      event: "play-sound",
      payload: { soundId },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl border border-white/10 bg-[#17131f] p-5 pb-safe shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-300">
              <Music size={22} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">Soundboard Moshi</h2>
              <p className="text-xs text-white/50">
                Les participants peuvent entendre les sons
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {SOUNDS.map((sound) => (
            <button
              key={sound.id}
              onClick={() => handlePlaySound(sound.id)}
              className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-white transition active:scale-95 hover:border-purple-400/50 hover:bg-purple-500/20"
            >
              <span className="text-3xl">{sound.emoji}</span>
              <span className="text-center text-xs font-semibold">
                {sound.name}
              </span>
              <Volume2 size={14} className="text-purple-300" />
            </button>
          ))}
        </div>

        <p className="mt-4 text-center text-[10px] text-white/40">
          Les sons sont partagés avec les participants connectés au live.
        </p>
      </div>
    </div>
  );
}
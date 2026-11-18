
"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Music, Volume2, Lock } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface SoundboardProps {
  isOpen: boolean;
  onClose: () => void;
  liveId: string;
  canUseSoundboard: boolean;
}

const SOUNDS = [
  {
    id: "applause",
    name: "Applaudissements",
    emoji: "👏",
    file: "/sounds/applause.mp3",
  },
  {
    id: "trompette",
    name: "Trompette",
    emoji: "🎺",
    file: "/sounds/trompette.mp3",
  },
  {
    id: "rire",
    name: "Rires",
    emoji: "😂",
    file: "/sounds/rire.mp3",
  },
  {
    id: "suspense",
    name: "Suspense",
    emoji: "😱",
    file: "/sounds/suspense.mp3",
  },
  {
    id: "victoire",
    name: "Victoire",
    emoji: "🏆",
    file: "/sounds/victoire.mp3",
  },
  {
    id: "magie",
    name: "Magie",
    emoji: "✨",
    file: "/sounds/magie.mp3",
  },
];

export default function Soundboard({
  isOpen,
  onClose,
  liveId,
  canUseSoundboard,
}: SoundboardProps) {
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSoundLocally = useCallback(async (soundId: string) => {
    const sound = SOUNDS.find((item) => item.id === soundId);

    if (!sound) return;

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const audio = new Audio(sound.file);
      audio.volume = 0.75;
      audioRef.current = audio;

      await audio.play();
    } catch (error) {
      console.warn("Lecture du son impossible :", error);
    }
  }, []);

  // Tous les participants reçoivent les sons du live.
  useEffect(() => {
    if (!liveId) return;

    const channel = supabase
      .channel(`live-sounds-${liveId}`, {
        config: {
          broadcast: {
            self: false,
          },
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
      void supabase.removeChannel(channel);
    };
  }, [liveId, supabase, playSoundLocally]);

  // Seuls l'hôte et les modérateurs autorisés peuvent déclencher un son.
  const handlePlaySound = async (soundId: string) => {
    if (!canUseSoundboard) {
      console.warn("Permission Soundboard refusée.");
      return;
    }

    const soundExists = SOUNDS.some((sound) => sound.id === soundId);

    if (!soundExists || !channelRef.current) return;

    // Lecture immédiate chez la personne qui déclenche le son.
    await playSoundLocally(soundId);

    // Diffusion aux autres participants.
    const status = await channelRef.current.send({
      type: "broadcast",
      event: "play-sound",
      payload: {
        soundId,
      },
    });

    if (status !== "ok") {
      console.error("Erreur de diffusion du son :", status);
    }
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
              <h2 className="text-lg font-bold text-white">
                Soundboard Moshi
              </h2>

              <p className="text-xs text-white/50">
                Sons partagés avec les participants
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-white"
            aria-label="Fermer le Soundboard"
          >
            <X size={20} />
          </button>
        </div>

        {canUseSoundboard ? (
          <>
            <div className="mb-4 rounded-xl border border-purple-400/20 bg-purple-500/10 p-3">
              <p className="text-xs text-purple-200">
                Tu peux déclencher des sons. Tous les participants pourront les entendre.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {SOUNDS.map((sound) => (
                <button
                  key={sound.id}
                  type="button"
                  onClick={() => void handlePlaySound(sound.id)}
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
          </>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-8 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
              <Lock size={25} className="text-white/70" />
            </div>

            <h3 className="text-sm font-bold text-white">
              Accès réservé
            </h3>

            <p className="mt-2 max-w-xs text-xs leading-5 text-white/50">
              Seul l'hôte et les modérateurs autorisés peuvent utiliser le Soundboard.
              Tu peux néanmoins écouter les sons déclenchés pendant le live.
            </p>
          </div>
        )}

        <p className="mt-4 text-center text-[10px] text-white/40">
          Soundboard Moshi
        </p>
      </div>
    </div>
  );
}

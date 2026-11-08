"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Volume2, VolumeX, Zap, DollarSign, Users, Sparkles,
  Music, Megaphone, PartyPopper, AlertCircle
} from "lucide-react";

export interface SoundEffect {
  id: string;
  name: string;
  category: "drama" | "sales" | "interaction" | "studio" | "transition";
  icon: React.ReactNode;
  color: string;
  // In production: path to audio file or LiveKit data message payload
  soundKey: string;
  premium?: boolean;
}

const EFFECTS: SoundEffect[] = [
  { id: "drama-boom", name: "Boom Dramatique", category: "drama", icon: <Zap className="w-4 h-4" />, color: "bg-red-600", soundKey: "drama_boom" },
  { id: "drama-suspense", name: "Suspense", category: "drama", icon: <AlertCircle className="w-4 h-4" />, color: "bg-purple-600", soundKey: "drama_suspense" },
  { id: "cash-register", name: "Caisse", category: "sales", icon: <DollarSign className="w-4 h-4" />, color: "bg-green-600", soundKey: "cash_register", premium: true },
  { id: "sale-success", name: "Vente !", category: "sales", icon: <PartyPopper className="w-4 h-4" />, color: "bg-emerald-500", soundKey: "sale_success" },
  { id: "applause", name: "Applaudissements", category: "interaction", icon: <Users className="w-4 h-4" />, color: "bg-blue-500", soundKey: "applause" },
  { id: "cheer", name: "Acclamations", category: "interaction", icon: <Megaphone className="w-4 h-4" />, color: "bg-cyan-500", soundKey: "cheer" },
  { id: "whoosh", name: "Whoosh", category: "transition", icon: <Sparkles className="w-4 h-4" />, color: "bg-amber-500", soundKey: "whoosh" },
  { id: "stinger", name: "Stinger", category: "transition", icon: <Music className="w-4 h-4" />, color: "bg-pink-500", soundKey: "stinger", premium: true },
  { id: "studio-echo", name: "Echo Studio", category: "studio", icon: <Volume2 className="w-4 h-4" />, color: "bg-indigo-500", soundKey: "studio_echo" },
  { id: "studio-riser", name: "Riser", category: "studio", icon: <Music className="w-4 h-4" />, color: "bg-violet-500", soundKey: "studio_riser", premium: true },
];

const CATEGORIES = [
  { id: "all", label: "Tous" },
  { id: "drama", label: "Drama" },
  { id: "sales", label: "Ventes" },
  { id: "interaction", label: "Interaction" },
  { id: "transition", label: "Transitions" },
  { id: "studio", label: "Studio" },
];

interface Props {
  /** Callback to inject sound into LiveKit room (data message or audio track) */
  onTrigger?: (soundKey: string, effect: SoundEffect) => void;
  muted?: boolean;
}

export function Soundboard({ onTrigger, muted: mutedProp }: Props) {
  const [category, setCategory] = useState("all");
  const [muted, setMuted] = useState(mutedProp ?? false);
  const [lastPlayed, setLastPlayed] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.8);
  const cooldown = useRef<Record<string, number>>({});

  const filtered = category === "all"
    ? EFFECTS
    : EFFECTS.filter((e) => e.category === category);

  const play = useCallback((effect: SoundEffect) => {
    if (muted) return;
    const now = Date.now();
    if (cooldown.current[effect.id] && now - cooldown.current[effect.id] < 800) return;
    cooldown.current[effect.id] = now;

    setLastPlayed(effect.id);
    setTimeout(() => setLastPlayed(null), 400);

    // Production: send via LiveKit room.localParticipant.publishData
    // or play local audio + mix into stream
    onTrigger?.(effect.soundKey, effect);

    // Local preview (optional Web Audio / HTMLAudioElement)
    try {
      // Placeholder: real files would be in /public/sounds/
      console.log(`[Soundboard] Trigger: ${effect.soundKey} @ vol ${volume}`);
    } catch {
      /* ignore */
    }
  }, [muted, onTrigger, volume]);

  return (
    <div className="card border-champagne/20">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Music className="w-4 h-4 text-champagne" /> Soundboard
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-16 h-1 accent-coral"
            title="Volume"
          />
          <button
            onClick={() => setMuted(!muted)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10"
          >
            {muted ? <VolumeX className="w-4 h-4 text-muted" /> : <Volume2 className="w-4 h-4 text-coral" />}
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-medium flex-shrink-0 transition",
              category === c.id ? "bg-coral text-white" : "bg-white/5 text-muted hover:bg-white/10"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {filtered.map((e) => (
          <button
            key={e.id}
            onClick={() => play(e)}
            disabled={muted}
            className={cn(
              "relative flex flex-col items-center gap-1 p-3 rounded-xl text-white transition active:scale-95",
              e.color,
              lastPlayed === e.id && "ring-2 ring-white scale-105",
              muted && "opacity-40 cursor-not-allowed"
            )}
          >
            {e.icon}
            <span className="text-[10px] font-medium leading-tight text-center">{e.name}</span>
            {e.premium && (
              <span className="absolute top-1 right-1 text-[8px] bg-black/40 px-1 rounded text-champagne">PRO</span>
            )}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-muted mt-3 text-center">
        Les sons sont injectés dans le stream LiveKit pour tous les viewers.
      </p>
    </div>
  );
}

"use client";

/**
 * Effets & filtres – panneau UI
 *
 * Les vrais effets (beauty, AR, filters) nécessitent :
 * - MediaPipe / TensorFlow.js / Banuba / DeepAR
 * - ou les filtres natifs du navigateur (CSS / WebGL)
 *
 * Ici : structure UI prête à brancher un moteur d'effets.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

const FILTERS = [
  { id: "none", label: "Normal" },
  { id: "vivid", label: "Vivid" },
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Cool" },
  { id: "mono", label: "Mono" },
  { id: "vintage", label: "Vintage" },
];

interface EffectsPanelProps {
  onSelect?: (filterId: string) => void;
}

export default function EffectsPanel({ onSelect }: EffectsPanelProps) {
  const [active, setActive] = useState("none");

  return (
    <div className="bg-black/80 backdrop-blur rounded-2xl p-3">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Sparkles className="w-4 h-4 text-red-500" />
        <span className="text-sm font-semibold">Effets</span>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setActive(f.id);
              onSelect?.(f.id);
            }}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition",
              active === f.id
                ? "bg-red-500 border-red-500 text-white"
                : "border-neutral-700 text-neutral-300"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-neutral-600 mt-2 px-1">
        Branchez MediaPipe / WebGL / Banuba pour les vrais effets AR.
      </p>
    </div>
  );
}

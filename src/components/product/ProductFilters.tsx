"use client";

import { cn } from "@/lib/utils";

const TIERS = [
  { id: "all", label: "Tous" },
  { id: "budget", label: "Bas prix" },
  { id: "standard", label: "Standard" },
  { id: "premium", label: "Premium / Qualité" },
];

export function ProductFilters({ value = "all", onChange }: { value?: string; onChange?: (v: string) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {TIERS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange?.(t.id)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition",
            value === t.id ? "bg-coral text-white" : "bg-white/5 text-muted hover:bg-white/10"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

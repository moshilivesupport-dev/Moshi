"use client";

import { cn } from "@/lib/utils";

const LEVELS: Record<string, { icon: string; color: string }> = {
  bronze: { icon: "🥉", color: "text-amber-700" },
  silver: { icon: "🥈", color: "text-gray-300" },
  gold: { icon: "🥇", color: "text-champagne" },
  platinum: { icon: "💎", color: "text-cyan-300" },
  diamond: { icon: "👑", color: "text-purple-300" },
};

export function FanBadge({ level = "bronze", size = "sm" }: { level?: string; size?: "sm" | "md" }) {
  const l = LEVELS[level] || LEVELS.bronze;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full bg-white/10 px-1.5 py-0.5",
        size === "sm" ? "text-[10px]" : "text-xs",
        l.color
      )}
      title={`Niveau ${level}`}
    >
      <span>{l.icon}</span>
      <span className="capitalize font-medium">{level}</span>
    </span>
  );
}

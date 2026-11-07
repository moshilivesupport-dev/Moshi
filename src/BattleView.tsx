"use client";

import { cn } from "@/lib/utils";
import { Swords } from "lucide-react";

interface BattleSide {
  username: string;
  avatar_url?: string;
  score: number;
}

interface Props {
  title: string;
  sideA: BattleSide;
  sideB: BattleSide;
  status: string;
}

export function BattleView({ title, sideA, sideB, status }: Props) {
  const total = sideA.score + sideB.score || 1;
  const pctA = Math.round((sideA.score / total) * 100);

  return (
    <div className="card border-champagne/30">
      <div className="flex items-center justify-center gap-2 mb-4">
        <Swords className="w-5 h-5 text-champagne" />
        <h3 className="font-bold text-white">{title || "Live Battle"}</h3>
        {status === "live" && (
          <span className="px-2 py-0.5 bg-coral rounded text-[10px] font-bold animate-pulse">LIVE</span>
        )}
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 text-center">
          <div className="w-12 h-12 rounded-full mx-auto overflow-hidden border-2 border-coral mb-1">
            {sideA.avatar_url ? <img src={sideA.avatar_url} className="w-full h-full object-cover" /> : null}
          </div>
          <p className="text-xs font-medium text-white truncate">{sideA.username}</p>
          <p className="text-lg font-bold text-coral">{sideA.score.toLocaleString()}</p>
        </div>

        <div className="text-2xl text-muted">VS</div>

        <div className="flex-1 text-center">
          <div className="w-12 h-12 rounded-full mx-auto overflow-hidden border-2 border-champagne mb-1">
            {sideB.avatar_url ? <img src={sideB.avatar_url} className="w-full h-full object-cover" /> : null}
          </div>
          <p className="text-xs font-medium text-white truncate">{sideB.username}</p>
          <p className="text-lg font-bold text-champagne">{sideB.score.toLocaleString()}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-3 rounded-full bg-white/10 overflow-hidden flex">
        <div className="bg-coral transition-all duration-500" style={{ width: `${pctA}%` }} />
        <div className="bg-champagne transition-all duration-500" style={{ width: `${100 - pctA}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted mt-1">
        <span>{pctA}%</span>
        <span>{100 - pctA}%</span>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Play, Gift, ShoppingBag, Users } from "lucide-react";

interface Highlight {
  t: number; // seconds
  type: "gift" | "sale" | "peak";
  label: string;
}

interface Props {
  title: string;
  duration: number;
  highlights?: Highlight[];
  replayUrl?: string;
}

export function ReplayPlayer({ title, duration, highlights = [], replayUrl }: Props) {
  const [current, setCurrent] = useState(0);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const icons = { gift: Gift, sale: ShoppingBag, peak: Users };

  return (
    <div className="card p-0 overflow-hidden">
      <div className="aspect-video bg-gradient-to-br from-anthracite to-onyx flex items-center justify-center relative">
        <button className="w-16 h-16 rounded-full bg-coral/90 flex items-center justify-center">
          <Play className="w-7 h-7 text-white ml-1" />
        </button>
        <span className="absolute bottom-3 right-3 text-xs bg-black/60 px-2 py-1 rounded">
          {formatTime(duration)}
        </span>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-white mb-3">{title}</h3>

        {highlights.length > 0 && (
          <>
            <p className="text-xs text-muted mb-2">Moments forts</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {highlights.map((h, i) => {
                const Icon = icons[h.type] || Gift;
                return (
                  <button
                    key={i}
                    onClick={() => setCurrent(h.t)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs flex-shrink-0"
                  >
                    <Icon className="w-3.5 h-3.5 text-coral" />
                    <span className="text-white">{h.label}</span>
                    <span className="text-muted">{formatTime(h.t)}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

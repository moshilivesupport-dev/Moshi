"use client";

import { FanBadge } from "./FanBadge";
import { formatNumber } from "@/lib/utils";

interface Entry {
  rank: number;
  username: string;
  avatar_url?: string;
  total_coins: number;
  fan_level?: string;
}

export function Leaderboard({ entries }: { entries: Entry[] }) {
  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-champagne mb-3">🏆 Top Gifters</h3>
      <div className="space-y-2">
        {entries.slice(0, 10).map((e) => (
          <div key={e.rank} className="flex items-center gap-2">
            <span className={`w-5 text-center text-xs font-bold ${e.rank <= 3 ? "text-champagne" : "text-muted"}`}>
              {e.rank}
            </span>
            <div className="w-7 h-7 rounded-full bg-onyx overflow-hidden flex-shrink-0">
              {e.avatar_url ? <img src={e.avatar_url} alt="" className="w-full h-full object-cover" /> : null}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white truncate flex items-center gap-1">
                {e.username}
                {e.fan_level && <FanBadge level={e.fan_level} />}
              </p>
            </div>
            <span className="text-xs text-champagne font-medium">{formatNumber(e.total_coins)}</span>
          </div>
        ))}
        {entries.length === 0 && <p className="text-xs text-muted text-center py-4">Aucun gift pour le moment</p>}
      </div>
    </div>
  );
}

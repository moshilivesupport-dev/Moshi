"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { KillSwitch } from "./KillSwitch";
import { Radio, Eye, Users } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface Stream {
  id: string;
  title: string;
  status: string;
  viewer_count: number;
  seller?: { username: string; avatar_url?: string };
}

export function StreamModeration({ initialStreams }: { initialStreams: Stream[] }) {
  const [streams, setStreams] = useState(initialStreams);
  const supabase = createClient();

  const handleKilled = (id: string) => {
    setStreams((prev) => prev.map((s) => (s.id === id ? { ...s, status: "killed" } : s)));
  };

  return (
    <div className="space-y-3">
      {streams.length === 0 && (
        <div className="card text-center py-10 text-muted text-sm">Aucun live en cours</div>
      )}
      {streams.map((s) => (
        <div key={s.id} className="card flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-onyx overflow-hidden flex-shrink-0 border border-coral/40">
              {s.seller?.avatar_url ? (
                <img src={s.seller.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted">?</div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{s.title}</p>
              <p className="text-xs text-muted">@{s.seller?.username || "—"}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {formatNumber(s.viewer_count)}
            </span>
            <span className={`px-2 py-0.5 rounded-full font-medium ${
              s.status === "live" ? "bg-coral/20 text-coral" :
              s.status === "killed" ? "bg-red-500/20 text-red-400" :
              "bg-white/10 text-muted"
            }`}>
              {s.status}
            </span>
          </div>

          {s.status === "live" && (
            <KillSwitch streamId={s.id} onKilled={() => handleKilled(s.id)} />
          )}
        </div>
      ))}
    </div>
  );
}

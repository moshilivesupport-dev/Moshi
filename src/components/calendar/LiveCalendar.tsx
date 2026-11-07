"use client";

import { Calendar, Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ScheduledLive {
  id: string;
  title: string;
  seller_username: string;
  scheduled_at: string;
  notify?: boolean;
}

export function LiveCalendar({ lives }: { lives: ScheduledLive[] }) {
  return (
    <div className="space-y-3">
      {lives.map((l) => {
        const date = new Date(l.scheduled_at);
        return (
          <div key={l.id} className="card flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-coral/10 flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-xs text-muted">{date.toLocaleString("fr", { month: "short" })}</span>
              <span className="text-lg font-bold text-coral">{date.getDate()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{l.title}</p>
              <p className="text-xs text-muted">
                @{l.seller_username} · {date.toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <Button size="sm" variant="outline">
              <Bell className="w-3.5 h-3.5 mr-1" /> Rappel
            </Button>
          </div>
        );
      })}
      {lives.length === 0 && (
        <div className="card text-center py-12 text-muted text-sm">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
          Aucun live programmé
        </div>
      )}
    </div>
  );
}

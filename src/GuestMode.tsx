"use client";

import { Button } from "@/components/ui/Button";
import { UserPlus, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useState } from "react";

interface Guest {
  id: string;
  username: string;
  avatar_url?: string;
  role: string;
}

export function GuestMode({ guests = [], isHost = false }: { guests?: Guest[]; isHost?: boolean }) {
  const [inviting, setInviting] = useState(false);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Invités / Collab</h3>
        {isHost && (
          <Button size="sm" variant="outline" onClick={() => setInviting(!inviting)}>
            <UserPlus className="w-3.5 h-3.5 mr-1" /> Inviter
          </Button>
        )}
      </div>

      {inviting && (
        <div className="mb-3 flex gap-2">
          <input placeholder="@username" className="input-field text-sm flex-1" />
          <Button size="sm">Envoyer</Button>
        </div>
      )}

      <div className="space-y-2">
        {guests.map((g) => (
          <div key={g.id} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-onyx overflow-hidden">
              {g.avatar_url ? <img src={g.avatar_url} className="w-full h-full object-cover" /> : null}
            </div>
            <div className="flex-1">
              <p className="text-xs text-white">{g.username}</p>
              <p className="text-[10px] text-muted capitalize">{g.role}</p>
            </div>
            <div className="flex gap-1">
              <button className="p-1.5 rounded-lg bg-white/5"><Mic className="w-3.5 h-3.5" /></button>
              <button className="p-1.5 rounded-lg bg-white/5"><Video className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
        {guests.length === 0 && <p className="text-xs text-muted text-center py-3">Aucun invité</p>}
      </div>
    </div>
  );
}

"use client";

/**
 * Live Streaming – structure prête pour WebRTC
 *
 * Moshi ne réimplémente pas WebRTC from scratch.
 * Branche un provider :
 *   - LiveKit (recommandé) → https://livekit.io
 *   - Agora
 *   - Cloudflare Calls
 *
 * Ce composant gère les métadonnées + UI.
 * Le vrai flux audio/vidéo passe par le SDK du provider.
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Radio, Users } from "lucide-react";

interface LiveRoomProps {
  sessionId: string;
  isHost?: boolean;
}

export default function LiveRoom({ sessionId, isHost = false }: LiveRoomProps) {
  const supabase = createClient();
  const [session, setSession] = useState<any>(null);
  const [viewers, setViewers] = useState(0);

  useEffect(() => {
    supabase
      .from("live_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()
      .then(({ data }) => setSession(data));

    // TODO: connecter au room LiveKit / Agora ici
    // const room = new Room();
    // await room.connect(url, token);
  }, [sessionId, supabase]);

  if (!session) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] bg-black text-white">
      {/* Zone vidéo (à remplacer par le player provider) */}
      <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
        <div className="text-center">
          <Radio className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="font-semibold">
            {isHost ? "Vous êtes en live" : "Live en cours"}
          </p>
          <p className="text-sm text-neutral-400 mt-1">
            Branchez LiveKit / Agora dans ce composant
          </p>
          {session.room_name && (
            <p className="text-xs text-neutral-600 mt-2">Room: {session.room_name}</p>
          )}
        </div>
      </div>

      {/* Badge */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 px-2.5 py-1 rounded-md text-xs font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        LIVE
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/50 px-2.5 py-1 rounded-md text-xs">
        <Users className="w-3.5 h-3.5" />
        {viewers || session.viewers_count || 0}
      </div>
    </div>
  );
}

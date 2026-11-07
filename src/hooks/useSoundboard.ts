"use client";

import { useCallback, useState } from "react";
import type { SoundEffect } from "@/components/soundboard/Soundboard";

/**
 * Hook to bridge Soundboard → LiveKit room.
 * In production: use livekit-client Room and publishData / AudioTrack.
 */
export function useSoundboard(room?: { localParticipant?: { publishData: (data: Uint8Array, opts?: any) => Promise<void> } } | null) {
  const [lastSound, setLastSound] = useState<string | null>(null);

  const trigger = useCallback(async (soundKey: string, effect: SoundEffect) => {
    setLastSound(soundKey);

    if (room?.localParticipant) {
      try {
        const payload = new TextEncoder().encode(JSON.stringify({
          type: "soundboard",
          soundKey,
          effectId: effect.id,
          name: effect.name,
          ts: Date.now(),
        }));
        await room.localParticipant.publishData(payload, { reliable: true });
      } catch (e) {
        console.warn("LiveKit publishData failed", e);
      }
    } else {
      // Demo / no room: local only
      console.log("[useSoundboard] local trigger", soundKey);
    }
  }, [room]);

  return { trigger, lastSound };
}

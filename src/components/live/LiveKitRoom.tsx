"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2 } from "lucide-react";

interface LiveKitRoomProps {
  roomName: string;
  participantName: string;
  isHost: boolean;
}

export default function LiveKitRoomComponent({ roomName, participantName, isHost }: LiveKitRoomProps) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await fetch(`/api/livekit/token?room=${roomName}&name=${encodeURIComponent(participantName)}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setToken(data.token);
      } catch (err: any) {
        setError(err.message);
      }
    };
    fetchToken();
  }, [roomName, participantName]);

  if (error) return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white text-center p-6 z-30">
      <div>
        <p className="text-lg font-bold mb-2">Erreur LiveKit</p>
        <p className="text-sm text-red-400">{error}</p>
        <p className="text-xs text-white/50 mt-4">Vérifie tes clés API sur Cloudflare (Settings &gt; Environment Variables).</p>
      </div>
    </div>
  );

  if (!token) return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
      <Loader2 className="w-8 h-8 text-white animate-spin" />
    </div>
  );

  return (
    <LiveKitRoom
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      connect={true}
      video={isHost}
      audio={isHost}
      className="absolute inset-0 z-10"
      onDisconnected={() => { window.location.href = "/"; }}
      onError={(err) => setError(err.message)}
    >
      <VideoConference />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
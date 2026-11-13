"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Radio } from "lucide-react";

interface LiveRoomProps {
  liveId: string;
  roomName: string;
}

export default function LiveRoom({ liveId, roomName }: LiveRoomProps) {
  const router = useRouter();
  const supabase = createClient();

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }

        const res = await fetch("/api/live/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName }),
        });

        if (!res.ok) {
          const { error: errMsg } = await res.json();
          throw new Error(errMsg || "Impossible de rejoindre le live");
        }

        const { token: jwt } = await res.json();
        setToken(jwt);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur de connexion";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [roomName, supabase, router]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
          <p className="text-white text-sm">Connexion au live...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Radio className="w-12 h-12 text-neutral-700" />
        <p className="text-white font-semibold">Live inaccessible</p>
        <p className="text-neutral-400 text-sm">{error}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-6 py-2 bg-white text-black rounded-full font-semibold text-sm"
        >
          Retour
        </button>
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="h-[100dvh] bg-black" data-lk-theme="default">
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        connect={true}
        onDisconnected={() => {
          router.push(`/live/${liveId}/ended`);
        }}
        style={{ height: "100dvh" }}
      >
        <VideoConference />
        <RoomAudioRenderer />
        <ControlBar 
          variation="minimal" 
          controls={{ 
            camera: true, 
            microphone: true, 
            screenShare: false, 
            chat: false, 
            leave: true 
          }} 
        />
      </LiveKitRoom>
    </div>
  );
}
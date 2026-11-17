
"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import "@livekit/components-styles";

import {
  Track,
} from "livekit-client";

import { Loader2, VideoOff } from "lucide-react";

interface LiveKitRoomProps {
  roomName: string;
  participantName: string;
  isHost: boolean;
}

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL;

function FullScreenVideo() {
  const tracks = useTracks(
    [
      {
        source: Track.Source.Camera,
        withPlaceholder: false,
      },
    ],
    {
      onlySubscribed: false,
    }
  );

  // Cherche une caméra réellement publiée.
  const cameraTrack = tracks.find(
    (track) =>
      track.publication?.kind === Track.Kind.Video &&
      track.publication?.track
  );

  if (!cameraTrack) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black text-white">
        <VideoOff className="h-9 w-9 text-white/50" />
        <p className="text-sm text-white/70">
          En attente de la caméra de l'hôte...
        </p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 h-full w-full overflow-hidden bg-black">
      <VideoTrack
        trackRef={cameraTrack}
        className="h-full w-full"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </div>
  );
}

export default function LiveKitRoomComponent({
  roomName,
  participantName,
  isHost,
}: LiveKitRoomProps) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomName || !participantName) {
      setError("Informations de connexion au live manquantes.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchToken() {
      try {
        setLoading(true);
        setError(null);
        setToken(null);

        const query = new URLSearchParams({
          room: roomName,
          name: participantName,
        });

        const response = await fetch(
          `/api/livekit/token?${query.toString()}`,
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              `Erreur serveur (${response.status}).`
          );
        }

        if (!data?.token) {
          throw new Error(
            "Le serveur n'a pas fourni de jeton LiveKit."
          );
        }

        if (!controller.signal.aborted) {
          setToken(data.token);
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error("Erreur de connexion LiveKit :", err);

        setError(
          err instanceof Error
            ? err.message
            : "Impossible de se connecter au live."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchToken();

    return () => {
      controller.abort();
    };
  }, [roomName, participantName]);

  if (!LIVEKIT_URL) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-black p-6 text-center text-white">
        <p className="text-sm text-red-400">
          Configuration manquante : NEXT_PUBLIC_LIVEKIT_URL.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
        <Loader2 className="h-9 w-9 animate-spin text-white" />
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-black p-6 text-center text-white">
        <div>
          <VideoOff className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <p className="mb-2 text-lg font-bold">
            Connexion vidéo impossible
          </p>
          <p className="text-sm text-red-300">
            {error || "Jeton LiveKit introuvable."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={LIVEKIT_URL}
      connect={true}
      video={isHost}
      audio={isHost}
      className="absolute inset-0 z-10 h-full w-full"
    >
      <FullScreenVideo />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

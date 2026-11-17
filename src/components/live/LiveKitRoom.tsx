
"use client";

import { useEffect, useState } from "react";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";

import "@livekit/components-styles";

import { Track } from "livekit-client";

import {
  Loader2,
  VideoOff,
  Mic,
} from "lucide-react";

interface LiveKitRoomProps {
  roomName: string;
  participantName: string;
  isHost: boolean;
}

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL;

function MultiParticipantVideo() {
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

  // Garder uniquement les caméras réellement publiées.
  const cameras = tracks.filter(
    (track) =>
      track.publication?.kind === Track.Kind.Video &&
      track.publication?.track
  );

  // Première caméra en grand.
  const mainCamera = cameras[0];

  // Les autres participants apparaissent en petites fenêtres.
  const guestCameras = cameras.slice(1);

  if (!mainCamera) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black text-white">
        <VideoOff className="h-10 w-10 text-white/50" />
        <p className="text-sm text-white/70">
          En attente de la caméra de l'hôte...
        </p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">

      {/* Caméra principale */}
      <div className="absolute inset-0">
        <VideoTrack
          trackRef={mainCamera}
          className="h-full w-full"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        <div className="absolute bottom-5 left-4 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
          {mainCamera.participant.name || "Participant"}
        </div>
      </div>

      {/* Caméras des invités */}
      <div className="absolute right-3 top-24 z-20 flex max-h-[65%] w-[30%] flex-col gap-3 overflow-y-auto">
        {guestCameras.map((camera) => (
          <div
            key={`${camera.participant.identity}-camera`}
            className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-white/30 bg-black shadow-xl"
          >
            <VideoTrack
              trackRef={camera}
              className="h-full w-full"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />

            <div className="absolute bottom-2 left-2 right-2 truncate rounded-full bg-black/50 px-2 py-1 text-xs text-white">
              {camera.participant.name || "Invité"}
            </div>
          </div>
        ))}
      </div>

      {/* Nombre de caméras actives */}
      <div className="absolute left-4 top-4 z-20 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
        {cameras.length} caméra{cameras.length > 1 ? "s" : ""} active{cameras.length > 1 ? "s" : ""}
      </div>
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
            data?.error || `Erreur serveur (${response.status}).`
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

    return () => controller.abort();
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
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-black">
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
      <MultiParticipantVideo />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

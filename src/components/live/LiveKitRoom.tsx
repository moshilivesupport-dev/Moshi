
"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
  useLocalParticipant,
} from "@livekit/components-react";
import type { TrackReference } from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  Loader2,
  Video,
  VideoOff,
  Mic,
  MicOff,
} from "lucide-react";

type LiveKitRoomProps = {
  roomName: string;
  participantName: string;
  isHost: boolean;
};

type TokenResponse = {
  token: string;
  roomName: string;
  isHost: boolean;
  isGuest: boolean;
  canPublish: boolean;
  livekitUrl: string;
  hostId: string;
  error?: string;
};

export default function LiveKitRoomComponent({
  roomName,
  participantName,
}: LiveKitRoomProps) {
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function getToken() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          room: roomName,
          name: participantName,
        });

        const response = await fetch(
          `/api/livekit/token?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const data = (await response.json()) as TokenResponse;

        if (!response.ok) {
          throw new Error(data.error || "Impossible de rejoindre le live.");
        }

        if (!data.token || !data.livekitUrl || !data.hostId) {
          throw new Error("Réponse LiveKit incomplète.");
        }

        setTokenData(data);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        setError(
          err instanceof Error
            ? err.message
            : "Une erreur est survenue."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void getToken();

    return () => controller.abort();
  }, [roomName, participantName]);

  if (loading) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Connexion au live...</p>
        </div>
      </div>
    );
  }

  if (error || !tokenData) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center bg-black p-6 text-center text-white">
        <div>
          <VideoOff className="mx-auto mb-3 h-10 w-10" />
          <p>{error || "Impossible de rejoindre le live."}</p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      key={`${tokenData.roomName}-${tokenData.token}`}
      serverUrl={tokenData.livekitUrl}
      token={tokenData.token}
      connect
      video={tokenData.canPublish}
      audio={tokenData.canPublish}
      options={{
        adaptiveStream: true,
        dynacast: true,
      }}
      className="h-full w-full bg-black"
    >
      <RoomAudioRenderer />
      <LiveVideoLayout
        hostId={tokenData.hostId}
        canPublish={tokenData.canPublish}
        isHost={tokenData.isHost}
        isGuest={tokenData.isGuest}
      />
    </LiveKitRoom>
  );
}

function LiveVideoLayout({
  hostId,
  canPublish,
  isHost,
  isGuest,
}: {
  hostId: string;
  canPublish: boolean;
  isHost: boolean;
  isGuest: boolean;
}) {
  const { localParticipant } = useLocalParticipant();

  const cameraTracks = useTracks(
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

  // Le test publication !== undefined élimine les pistes placeholder.
  const visibleTracks = cameraTracks.filter(
    (track): track is TrackReference =>
      track.publication !== undefined
  );

  const sortedTracks = [...visibleTracks].sort((a, b) => {
    if (a.participant.identity === hostId) return -1;
    if (b.participant.identity === hostId) return 1;
    return 0;
  });

  const hostTrack = sortedTracks.find(
    (track) => track.participant.identity === hostId
  );

  const guestTracks = sortedTracks.filter(
    (track) => track.participant.identity !== hostId
  );

  const [cameraEnabled, setCameraEnabled] = useState(
    localParticipant.isCameraEnabled
  );

  const [microphoneEnabled, setMicrophoneEnabled] = useState(
    localParticipant.isMicrophoneEnabled
  );

  useEffect(() => {
    setCameraEnabled(localParticipant.isCameraEnabled);
    setMicrophoneEnabled(localParticipant.isMicrophoneEnabled);
  }, [localParticipant]);

  async function toggleCamera() {
    if (!canPublish) return;

    try {
      const nextValue = !localParticipant.isCameraEnabled;
      await localParticipant.setCameraEnabled(nextValue);
      setCameraEnabled(nextValue);
    } catch (error) {
      console.error("Erreur caméra :", error);
    }
  }

  async function toggleMicrophone() {
    if (!canPublish) return;

    try {
      const nextValue = !localParticipant.isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(nextValue);
      setMicrophoneEnabled(nextValue);
    } catch (error) {
      console.error("Erreur microphone :", error);
    }
  }

  return (
    <div className="relative flex h-full min-h-[300px] w-full flex-col overflow-hidden bg-black text-white">
      <div className="relative min-h-0 flex-1">
        {hostTrack ? (
          <VideoTrack
            trackRef={hostTrack}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full min-h-[250px] items-center justify-center bg-zinc-900">
            <div className="text-center">
              <VideoOff className="mx-auto mb-2 h-10 w-10 text-zinc-400" />
              <p className="text-sm text-zinc-300">
                En attente de la caméra de l'hôte...
              </p>
            </div>
          </div>
        )}

        {hostTrack && (
          <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs">
            Hôte
          </div>
        )}
      </div>

      {guestTracks.length > 0 && (
        <div className="grid max-h-36 shrink-0 grid-cols-2 gap-2 overflow-y-auto bg-black p-2 sm:grid-cols-3">
          {guestTracks.map((track) => (
            <div
              key={`${track.participant.identity}-${track.source}`}
              className="relative aspect-video overflow-hidden rounded-xl bg-zinc-800"
            >
              <VideoTrack
                trackRef={track}
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-1 left-1 max-w-[90%] truncate rounded bg-black/60 px-2 py-1 text-xs">
                {track.participant.name || "Invité"}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex shrink-0 items-center justify-center gap-5 border-t border-white/10 bg-zinc-950 px-4 py-3">
        {canPublish ? (
          <>
            <button
              type="button"
              onClick={toggleMicrophone}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800"
              aria-label={
                microphoneEnabled ? "Couper le micro" : "Activer le micro"
              }
            >
              {microphoneEnabled ? (
                <Mic className="h-5 w-5" />
              ) : (
                <MicOff className="h-5 w-5 text-red-400" />
              )}
            </button>

            <button
              type="button"
              onClick={toggleCamera}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800"
              aria-label={
                cameraEnabled ? "Couper la caméra" : "Activer la caméra"
              }
            >
              {cameraEnabled ? (
                <Video className="h-5 w-5" />
              ) : (
                <VideoOff className="h-5 w-5 text-red-400" />
              )}
            </button>
          </>
        ) : (
          <p className="text-xs text-zinc-400">
            Mode spectateur — tu regardes le live
          </p>
        )}

        {isHost && (
          <span className="text-xs text-emerald-400">Hôte</span>
        )}

        {isGuest && (
          <span className="text-xs text-sky-400">Invité</span>
        )}
      </div>
    </div>
  );
}

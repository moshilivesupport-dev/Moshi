
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
import { Loader2, VideoOff } from "lucide-react";

export type LiveMediaControls = {
  microphoneEnabled: boolean;
  cameraEnabled: boolean;
  toggleMicrophone: () => Promise<void>;
  toggleCamera: () => Promise<void>;
};

type Props = {
  roomName: string;
  participantName: string;
  isHost: boolean;
  onControlsReady?: (controls: LiveMediaControls | null) => void;
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
  onControlsReady,
}: Props) {
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

        if (!controller.signal.aborted) setTokenData(data);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error ? err.message : "Une erreur est survenue."
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void getToken();
    return () => controller.abort();
  }, [roomName, participantName]);

  useEffect(() => {
    return () => onControlsReady?.(null);
  }, [onControlsReady]);

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black text-white">
        <Loader2 className="h-9 w-9 animate-spin" />
      </div>
    );
  }

  if (error || !tokenData) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black p-6 text-center text-white">
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
      className="absolute inset-0 h-full w-full bg-black"
    >
      <RoomAudioRenderer />
      <LiveVideoLayout
        hostId={tokenData.hostId}
        onControlsReady={onControlsReady}
      />
    </LiveKitRoom>
  );
}

function LiveVideoLayout({
  hostId,
  onControlsReady,
}: {
  hostId: string;
  onControlsReady?: (controls: LiveMediaControls | null) => void;
}) {
  const { localParticipant } = useLocalParticipant();

  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: false }
  );

  const visibleTracks = cameraTracks.filter(
    (track): track is TrackReference => track.publication !== undefined
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

  async function toggleCamera() {
    try {
      const next = !localParticipant.isCameraEnabled;
      await localParticipant.setCameraEnabled(next);
      setCameraEnabled(next);
    } catch (error) {
      console.error("Erreur caméra :", error);
    }
  }

  async function toggleMicrophone() {
    try {
      const next = !localParticipant.isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(next);
      setMicrophoneEnabled(next);
    } catch (error) {
      console.error("Erreur microphone :", error);
    }
  }

  useEffect(() => {
    setCameraEnabled(localParticipant.isCameraEnabled);
    setMicrophoneEnabled(localParticipant.isMicrophoneEnabled);

    onControlsReady?.({
      microphoneEnabled,
      cameraEnabled,
      toggleMicrophone,
      toggleCamera,
    });
  }, [
    localParticipant,
    microphoneEnabled,
    cameraEnabled,
    onControlsReady,
  ]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {hostTrack ? (
        <VideoTrack
          trackRef={hostTrack}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 text-white">
          <div className="text-center">
            <VideoOff className="mx-auto mb-3 h-10 w-10 text-zinc-400" />
            <p className="text-sm text-zinc-300">
              En attente de la caméra de l'hôte...
            </p>
          </div>
        </div>
      )}

      {guestTracks.length > 0 && (
        <div className="absolute right-3 top-28 z-10 flex max-h-[35vh] flex-col gap-2 overflow-y-auto">
          {guestTracks.map((track) => (
            <div
              key={`${track.participant.identity}-${track.source}`}
              className="relative h-24 w-20 overflow-hidden rounded-xl border border-white/30 bg-black shadow-lg"
            >
              <VideoTrack
                trackRef={track}
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 truncate bg-black/60 px-1 py-1 text-center text-[9px] text-white">
                {track.participant.name || "Invité"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

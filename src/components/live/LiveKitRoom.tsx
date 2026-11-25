
"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
  useLocalParticipant,
  useParticipants,
} from "@livekit/components-react";
import type { TrackReference } from "@livekit/components-react";
import { Track } from "livekit-client";
import {
  Loader2,
  VideoOff,
  Mic,
  MicOff,
  CameraOff,
  UserRound,
} from "lucide-react";

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
        setTokenData(null);
        onControlsReady?.(null);

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

        if (!controller.signal.aborted) {
          setTokenData(data);
        }
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
  }, [roomName, participantName, onControlsReady]);

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
        canPublish={tokenData.canPublish}
        onControlsReady={onControlsReady}
      />
    </LiveKitRoom>
  );
}

function AvatarPlaceholder({
  name,
  large = false,
}: {
  name: string;
  large?: boolean;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-zinc-800 via-zinc-950 to-black text-white">
      <div
        className={`flex items-center justify-center rounded-full border border-white/15 bg-white/10 font-bold ${
          large ? "h-24 w-24 text-4xl" : "h-10 w-10 text-lg"
        }`}
      >
        {initial}
      </div>
      {large && (
        <p className="mt-3 text-sm text-white/70">
          Caméra désactivée
        </p>
      )}
    </div>
  );
}

function LiveVideoLayout({
  hostId,
  canPublish,
  onControlsReady,
}: {
  hostId: string;
  canPublish: boolean;
  onControlsReady?: (controls: LiveMediaControls | null) => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();

  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: false }
  );

  const visibleTracks = cameraTracks.filter(
    (track): track is TrackReference => track.publication !== undefined
  );

  const findCameraTrack = (identity: string) =>
    visibleTracks.find(
      (track) => track.participant.identity === identity
    );

  const hostParticipant = participants.find(
    (participant) => participant.identity === hostId
  );

  const guestParticipants = participants
    .filter((participant) => participant.identity !== hostId)
    .sort((a, b) => a.identity.localeCompare(b.identity));

  const [cameraEnabled, setCameraEnabled] = useState(
    localParticipant.isCameraEnabled
  );

  const [microphoneEnabled, setMicrophoneEnabled] = useState(
    localParticipant.isMicrophoneEnabled
  );

  async function toggleCamera() {
    if (!canPublish) return;

    try {
      const next = !localParticipant.isCameraEnabled;
      await localParticipant.setCameraEnabled(next);
      setCameraEnabled(next);
    } catch (error) {
      console.error("Erreur caméra :", error);
    }
  }

  async function toggleMicrophone() {
    if (!canPublish) return;

    try {
      const next = !localParticipant.isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(next);
      setMicrophoneEnabled(next);
    } catch (error) {
      console.error("Erreur microphone :", error);
    }
  }

  useEffect(() => {
    if (!canPublish) {
      onControlsReady?.(null);
      return;
    }

    setCameraEnabled(localParticipant.isCameraEnabled);
    setMicrophoneEnabled(localParticipant.isMicrophoneEnabled);

    onControlsReady?.({
      microphoneEnabled: localParticipant.isMicrophoneEnabled,
      cameraEnabled: localParticipant.isCameraEnabled,
      toggleMicrophone,
      toggleCamera,
    });
  }, [
    canPublish,
    localParticipant,
    microphoneEnabled,
    cameraEnabled,
    onControlsReady,
  ]);

  const hostTrack = findCameraTrack(hostId);
  const hostCameraActive =
    !!hostParticipant?.isCameraEnabled && !!hostTrack;

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {/* Vidéo principale de l'hôte */}
      <div className="absolute inset-0">
        {hostCameraActive && hostTrack ? (
          <VideoTrack
            trackRef={hostTrack}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0">
            <AvatarPlaceholder
              name={hostParticipant?.name || "Hôte du live"}
              large
            />
          </div>
        )}

        <div className="absolute bottom-28 left-4 z-10 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          {hostParticipant?.name || "Hôte"}
        </div>
      </div>

      {/* Invités connectés : leur vignette reste visible même sans caméra */}
      {guestParticipants.length > 0 && (
        <div className="absolute right-3 top-28 z-20 flex max-h-[48vh] flex-col gap-2 overflow-y-auto">
          {guestParticipants.map((participant) => {
            const track = findCameraTrack(participant.identity);
            const cameraActive =
              participant.isCameraEnabled && !!track;

            return (
              <div
                key={participant.identity}
                className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl border border-white/30 bg-zinc-950 shadow-lg"
              >
                {cameraActive && track ? (
                  <VideoTrack
                    trackRef={track}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <AvatarPlaceholder
                    name={participant.name || "Invité"}
                  />
                )}

                {/* Nom de l'invité */}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 bg-black/70 px-1 py-1">
                  <span className="max-w-[48px] truncate text-[9px] text-white">
                    {participant.name || "Invité"}
                  </span>
                  {!participant.isMicrophoneEnabled && (
                    <MicOff size={10} className="shrink-0 text-red-400" />
                  )}
                </div>

                {/* État caméra */}
                {!cameraActive && (
                  <div className="absolute right-1 top-1 rounded-full bg-black/70 p-1">
                    <CameraOff size={11} className="text-white" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Nombre d'invités actuellement connectés */}
      {guestParticipants.length > 0 && (
        <div className="absolute right-3 top-[calc(28vh+8px)] z-20 rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
          <UserRound size={11} className="mr-1 inline" />
          {guestParticipants.length} invité
          {guestParticipants.length > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

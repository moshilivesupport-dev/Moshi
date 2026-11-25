
"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Loader2, VideoOff } from "lucide-react";

type Props = {
  liveId: string;
  participantName: string;
  accent: "pink" | "blue";
};

type TokenData = {
  token: string;
  roomName: string;
  livekitUrl: string;
  error?: string;
};

export default function LiveMatchVideo({
  liveId,
  participantName,
  accent,
}: Props) {
  const [data, setData] = useState<TokenData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadToken() {
      try {
        setLoading(true);
        setError("");
        setData(null);

        const params = new URLSearchParams({
          room: `live-${liveId}`,
          name: participantName,
          viewer: "1",
        });

        const response = await fetch(
          `/api/livekit/token?${params.toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Impossible de charger le flux vidéo."
          );
        }

        if (!result.token || !result.livekitUrl) {
          throw new Error("Réponse LiveKit incomplète.");
        }

        if (!controller.signal.aborted) {
          setData(result);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Erreur de connexion vidéo."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadToken();

    return () => controller.abort();
  }, [liveId, participantName]);

  const border =
    accent === "pink"
      ? "border-pink-400/70"
      : "border-blue-400/70";

  if (loading) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-zinc-950 text-white">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-zinc-950 p-3 text-center text-white">
        <div>
          <VideoOff className="mx-auto mb-2 h-7 w-7 text-white/50" />
          <p className="text-xs text-white/70">
            {error || "Flux indisponible"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      key={`${data.roomName}-${data.token}`}
      serverUrl={data.livekitUrl}
      token={data.token}
      connect
      audio={false}
      video={false}
      options={{
        adaptiveStream: true,
        dynacast: true,
      }}
      className="h-full w-full bg-black"
    >
      <MatchTrack border={border} />
    </LiveKitRoom>
  );
}

function MatchTrack({ border }: { border: string }) {
  const tracks = useTracks(
    [
      {
        source: Track.Source.Camera,
        withPlaceholder: true,
      },
    ],
    {
      onlySubscribed: true,
    }
  );

  const camera = tracks.find(
    (track) =>
      track.source === Track.Source.Camera &&
      track.publication?.isSubscribed !== false
  );

  if (!camera || !camera.publication) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-950 text-white">
        <div className="text-center">
          <VideoOff className="mx-auto mb-2 h-8 w-8 text-white/40" />
          <p className="text-xs text-white/60">
            En attente du diffuseur...
          </p>
        </div>
      </div>
    );
  }

  return (
    <VideoTrack
      trackRef={camera}
      className={`h-full w-full border-2 ${border} object-cover`}
    />
  );
}

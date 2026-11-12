"use client";

import { useState } from "react";
import LiveChat from "./LiveChat";
import { GiftOverlay, GiftEvent } from "./GiftOverlay";
import { FollowButton } from "./FollowButton";
import { Heart, Share2, Users, Coins } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface LivePlayerProps {
  sessionId: string;
  hostId: string;
  viewerCount: number;
  isHost?: boolean;
  currentUserId?: string;
}

export default function LivePlayer({ sessionId, hostId, viewerCount, isHost = false, currentUserId }: LivePlayerProps) {
  const [giftEvent, setGiftEvent] = useState<GiftEvent | null>(null);

  const handleGift = (event: GiftEvent) => {
    setGiftEvent(event);
    setTimeout(() => setGiftEvent(null), 3000);
  };

  return (
    <div className="relative h-[100dvh] w-full bg-black overflow-hidden">
      {/* Zone vidéo (Placeholder ou futur WebRTC) */}
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-900 via-black to-neutral-900">
        <div className="text-center p-6">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Users className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {isHost ? "Vous êtes en live" : "Live en cours"}
          </h2>
          <p className="text-sm text-neutral-400">
            Le flux vidéo WebRTC sera intégré ici.
          </p>
        </div>
      </div>

      {/* Dégradés pour la lisibilité */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

      {/* Header du live */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-red-600 px-3 py-1.5 rounded-lg shadow-lg">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-black tracking-wider">LIVE</span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
            <Users className="w-3.5 h-3.5 text-neutral-300" />
            <span className="text-xs font-bold">{formatNumber(viewerCount)}</span>
          </div>
        </div>
        
        {!isHost && (
          <FollowButton targetUserId={hostId} currentUserId={currentUserId} size="sm" />
        )}
      </div>

      {/* Overlay de cadeau */}
      {giftEvent && <GiftOverlay gifts={[giftEvent]} />}

      {/* Chat en bas à gauche */}
      <div className="absolute bottom-24 left-4 right-20 z-20">
        <LiveChat sessionId={sessionId} />
      </div>

      {/* Actions à droite */}
      <div className="absolute bottom-24 right-4 z-20 flex flex-col items-center gap-4">
        <button className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition">
          <Heart className="w-6 h-6 text-white" />
        </button>
        <button className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition">
          <Share2 className="w-6 h-6 text-white" />
        </button>
        <button 
          onClick={() => handleGift({ id: "1", icon: "🌹", name: "Rose", sender: "Vous", quantity: 1 })}
          className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition"
        >
          <Coins className="w-6 h-6 text-yellow-500" />
        </button>
      </div>
    </div>
  );
}

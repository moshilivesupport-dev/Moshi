"use client";

import { useState } from "react";
import { GiftOverlay, GiftEvent } from "./GiftOverlay";
import { LiveChat } from "./LiveChat";
import { FollowButton } from "./FollowButton";
import { Heart, Share2, Users, Coins } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface Stream {
  id: string;
  title: string;
  seller_id: string;
  seller?: {
    username: string;
    avatar_url?: string;
    followers_count?: number;
  };
  viewer_count: number;
  stream_url?: string;
  status: string;
}

interface Props {
  stream: Stream;
  currentUserId?: string;
  giftsCatalog?: {
    id: string;
    name: string;
    slug: string;
    coin_cost: number;
    icon: string;
  }[];
}

export function LivePlayer({
  stream,
  currentUserId,
  giftsCatalog = [],
}: Props) {
  const [activeGifts, setActiveGifts] = useState<GiftEvent[]>([]);
  const [showGifts, setShowGifts] = useState(false);

  const sendGift = async (gift: {
    name: string;
    icon: string;
    coin_cost: number;
  }) => {
    const id = Math.random().toString(36).slice(2);
    setActiveGifts((prev) => [
      ...prev,
      {
        id,
        icon: gift.icon,
        name: gift.name,
        sender: "Vous",
      },
    ]);
  };

  return (
    <div className="relative w-full h-[70vh] md:h-[80vh] bg-black rounded-2xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-anthracite to-onyx flex items-center justify-center">
        {stream.status === "live" ? (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-coral/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-coral flex items-center justify-center">
                <span className="text-white font-bold text-xs">LIVE</span>
              </div>
            </div>
            <p className="text-muted text-sm">Lecteur vidéo en direct</p>
            <p className="text-xs text-muted mt-1">
              (Intégrez Mux / Agora / LiveKit ici)
            </p>
          </div>
        ) : (
          <p className="text-muted">Stream non disponible</p>
        )}
      </div>

      <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between z-10 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-anthracite overflow-hidden border-2 border-coral">
            {stream.seller?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={stream.seller.avatar_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {stream.seller?.username || "Vendeur"}
            </p>
            <p className="text-xs text-muted flex items-center gap-1">
              <Users className="w-3 h-3" />
              {formatNumber(stream.viewer_count)} spectateurs
            </p>
          </div>
          <FollowButton
            targetUserId={stream.seller_id}
            currentUserId={currentUserId}
            size="sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-coral rounded-full text-xs font-bold text-white animate-pulse">
            EN DIRECT
          </span>
        </div>
      </div>

      <GiftOverlay
        gifts={activeGifts}
        onDone={(id) =>
          setActiveGifts((prev) => prev.filter((g) => g.id !== id))
        }
      />

      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        <div className="flex gap-3 items-end">
          <div className="flex-1 max-w-md">
            <LiveChat streamId={stream.id} currentUserId={currentUserId} />
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowGifts(!showGifts)}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-champagne to-gold flex items-center justify-center shadow-lg"
            >
              <Coins className="w-5 h-5 text-onyx" />
            </button>
            <button className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
              <Heart className="w-5 h-5 text-coral" />
            </button>
            <button className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {showGifts && (
          <div className="mt-3 p-3 bg-black/80 backdrop-blur rounded-2xl flex gap-3 overflow-x-auto">
            {giftsCatalog.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  sendGift(g);
                  setShowGifts(false);
                }}
                className="flex flex-col items-center min-w-[70px] p-2 rounded-xl hover:bg-white/10 transition"
              >
                <span className="text-3xl">{g.icon}</span>
                <span className="text-xs text-white mt-1">{g.name}</span>
                <span className="text-[10px] text-champagne">
                  {g.coin_cost} coins
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
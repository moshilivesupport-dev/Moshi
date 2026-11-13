"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2, Radio, X, ShoppingBag, Gift } from "lucide-react";
import Link from "next/link";
import GiftMenu from "@/components/live/GiftMenu";
import GiftAnimation from "@/components/live/GiftAnimation";

interface Product {
  id: string;
  title: string;
  price: number;
  currency: string | null;
  image_url: string | null;
}

interface LiveRoomClientProps {
  liveId: string;
  roomName: string;
  isHost: boolean;
  hostId: string;
  products: Product[];
  isSellerLive: boolean;
}

export default function LiveRoomClient({
  liveId,
  roomName,
  isHost,
  hostId,
  products,
  isSellerLive,
}: LiveRoomClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(products[0] || null);
  const [showGifts, setShowGifts] = useState(false);
  const [activeGift, setActiveGift] = useState<any>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
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
        const message = err instanceof Error ? err.message : "Erreur";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchToken();
  }, [roomName]);

  const handleEndLive = async () => {
    if (isHost) {
      await supabase
        .from("live_sessions")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", liveId);
    }
    router.push("/live");
  };

  if (loading) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          <p className="text-white text-sm">Connexion au live...</p>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="h-[100dvh] bg-black flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Radio className="w-12 h-12 text-neutral-700" />
        <p className="text-white font-semibold">Live inaccessible</p>
        <p className="text-neutral-400 text-sm">{error || "Erreur inconnue"}</p>
        <button onClick={() => router.push("/live")} className="mt-2 px-6 py-2 bg-white text-black rounded-full font-semibold text-sm">
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-black relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">LIVE</div>
          {isSellerLive && (
            <div className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <ShoppingBag className="w-2.5 h-2.5" /> SHOPPING
            </div>
          )}
        </div>
        <button onClick={handleEndLive} className="p-2">
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* LiveKit Video */}
      <LiveKitRoom
        video={isHost}
        audio={isHost}
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        connect={true}
        onDisconnected={handleEndLive}
        style={{ height: "100dvh" }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>

      {/* ✅ BOUTON CADEAU (uniquement pour les spectateurs) */}
      {!isHost && (
        <button
          onClick={() => setShowGifts(true)}
          className="absolute bottom-40 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-yellow-500 to-pink-500 flex items-center justify-center shadow-lg shadow-pink-500/30 active:scale-90 transition"
        >
          <Gift className="w-7 h-7 text-white" />
        </button>
      )}

      {/* ✅ CARTE PRODUIT ÉPINGLÉ */}
      {isSellerLive && selectedProduct && (
        <div className="absolute bottom-20 left-4 right-20 z-40">
          <div className="bg-black/90 backdrop-blur-md rounded-2xl p-3 flex items-center gap-3 border border-purple-500/50 shadow-lg shadow-purple-500/20">
            <div className="w-14 h-14 rounded-lg bg-neutral-800 flex-shrink-0 overflow-hidden">
              {selectedProduct.image_url ? (
                <img src={selectedProduct.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-6 h-6 text-neutral-600" /></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">{selectedProduct.title}</p>
              <p className="text-green-400 font-bold text-base">
                {Number(selectedProduct.price).toFixed(2)} {selectedProduct.currency || "€"}
              </p>
            </div>
            <Link
              href={`/shop/${selectedProduct.id}`}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm px-4 py-2 rounded-full transition flex-shrink-0"
            >
              Acheter
            </Link>
          </div>
        </div>
      )}

      {/* Miniatures des autres produits */}
      {isSellerLive && products.length > 1 && (
        <div className="absolute top-20 right-4 z-40 flex flex-col gap-2">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProduct(p)}
              className={`w-12 h-12 rounded-lg overflow-hidden border-2 ${
                selectedProduct?.id === p.id ? "border-purple-500" : "border-transparent opacity-60"
              }`}
            >
              {p.image_url ? (
                <img src={p.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ✅ MENU DES CADEAUX */}
      {showGifts && (
        <GiftMenu
          liveId={liveId}
          receiverId={hostId}
          onClose={() => setShowGifts(false)}
          onGiftSent={(gift) => setActiveGift(gift)}
        />
      )}

      {/* ✅ ANIMATION DU CADEAU */}
      <GiftAnimation gift={activeGift} onComplete={() => setActiveGift(null)} />
    </div>
  );
}
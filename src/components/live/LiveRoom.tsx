"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { ShoppingBag, X, Loader2 } from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  title: string;
  price: number;
  currency: string | null;
  image_url: string | null;
}

interface LiveRoomProps {
  liveId: string;
  roomName: string;
  isHost: boolean;
  products: Product[];
  isSellerLive: boolean;
}

export default function LiveRoom({ liveId, roomName, isHost, products, isSellerLive }: LiveRoomProps) {
  const router = useRouter();
  const supabase = createClient();
  
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(products[0] || null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await fetch("/api/live/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomName }),
        });
        if (!res.ok) throw new Error("Impossible de rejoindre le live");
        const { token: jwt } = await res.json();
        setToken(jwt);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        setLoading(false);
      }
    };
    fetchToken();
  }, [roomName]);

  const handleEndLive = async () => {
    if (isHost) {
      await supabase.from("live_sessions").update({ status: "ended" }).eq("id", liveId);
    }
    router.push("/live");
  };

  if (loading) return <div className="h-[100dvh] bg-black flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (error) return <div className="h-[100dvh] bg-black flex items-center justify-center text-red-500">{error}</div>;
  if (!token) return null;

  return (
    <div className="h-[100dvh] w-full bg-black relative flex flex-col">
      {/* Header du Live */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">LIVE</div>
          {isSellerLive && <div className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded">SHOPPING</div>}
        </div>
        <button onClick={handleEndLive} className="text-white p-2"><X className="w-6 h-6" /></button>
      </div>

      {/* Vidéo LiveKit */}
      <div className="flex-1 relative">
        <LiveKitRoom token={token} serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL} connect={true} video={isHost} audio={isHost} onDisconnected={handleEndLive}>
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>

      {/* ✅ CARTE PRODUIT ÉPINGLÉ (en bas) */}
      {isSellerLive && selectedProduct && (
        <div className="absolute bottom-20 left-4 right-4 z-40">
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
              <p className="text-green-400 font-bold text-base">{selectedProduct.price.toFixed(2)} {selectedProduct.currency || "€"}</p>
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

      {/* ✅ LISTE DES PRODUITS (si plusieurs) - visible en petit en haut à droite ou en bas */}
      {isSellerLive && products.length > 1 && (
        <div className="absolute top-20 right-4 z-40 flex flex-col gap-2">
          {products.map((p) => (
            <button 
              key={p.id} 
              onClick={() => setSelectedProduct(p)}
              className={`w-12 h-12 rounded-lg overflow-hidden border-2 ${selectedProduct?.id === p.id ? 'border-purple-500' : 'border-transparent opacity-60'}`}
            >
              {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-neutral-800 flex items-center justify-center"><ShoppingBag className="w-4 h-4" /></div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
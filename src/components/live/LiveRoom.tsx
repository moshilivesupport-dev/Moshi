"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  LiveKitRoom, 
  RoomAudioRenderer, 
  useTracks, 
  TrackReference 
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Radio, Users, Gift, ShoppingBag } from "lucide-react";
import LiveChat from "./LiveChat";
import LiveProductPin from "./LiveProductPin";

interface LiveRoomProps {
  sessionId: string;
  isHost?: boolean;
  token?: string; // Token LiveKit généré par votre backend
  serverUrl?: string; // URL LiveKit
}

// Composant interne pour gérer l'affichage vidéo une fois connecté
function VideoLayout({ isHost }: { isHost: boolean }) {
  const tracks = useTracks();
  
  // Trouver la piste vidéo du host (ou la première disponible)
  const videoTrack = tracks.find((t) => t.publication.kind === "video") as TrackReference | undefined;

  return (
    <div className="absolute inset-0 bg-black">
      {videoTrack ? (
        <video 
          ref={(el) => {
            if (el && videoTrack.publication.track) {
              videoTrack.publication.track.attach(el);
            }
          }}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted={isHost} // Mute pour le host pour éviter l'echo
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-neutral-900">
          <Radio className="w-16 h-16 text-neutral-700 animate-pulse" />
        </div>
      )}
      <RoomAudioRenderer />
    </div>
  );
}

export default function LiveRoom({ sessionId, isHost = false, token, serverUrl }: LiveRoomProps) {
  const supabase = createClient();
  const [session, setSession] = useState<any>(null);
  const [viewers, setViewers] = useState(0);
  const [pinnedProduct, setPinnedProduct] = useState<any>(null);

  // 1. Charger les métadonnées du live
  useEffect(() => {
    supabase
      .from("live_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()
      .then(({ data }) => setSession(data));
  }, [sessionId, supabase]);

  // 2. Écouter les mises à jour du nombre de spectateurs (optionnel, via Realtime)
  useEffect(() => {
    const channel = supabase
      .channel(`live-viewers-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          setViewers(payload.new.viewers_count || 0);
          // Si le host épingle un produit, on le met à jour ici
          if (payload.new.pinned_product_id) {
            // Fetch du produit (simplifié ici, à adapter selon votre schema)
            setPinnedProduct({ id: "1", name: "Produit Démo", price: 29.99, image_url: "https://picsum.photos/100", stock: 15 });
          } else {
            setPinnedProduct(null);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, supabase]);

  if (!session) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Si les credentials LiveKit sont manquants, on affiche un fallback (pour le dev)
  if (!token || !serverUrl) {
    return (
      <div className="relative h-[100dvh] bg-black text-white overflow-hidden">
        {/* Fallback Vidéo */}
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-900 to-black">
          <div className="text-center p-6">
            <Radio className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
            <h2 className="text-xl font-bold mb-2">Mode Démo Live</h2>
            <p className="text-sm text-neutral-400 mb-4">
              Configurez LIVEKIT_URL et générez un token pour activer la vraie vidéo.
            </p>
            <div className="inline-block bg-neutral-800 px-4 py-2 rounded-lg text-xs font-mono text-neutral-300">
              Room: {session.room_name || sessionId}
            </div>
          </div>
        </div>

        {/* UI Overlay (identique au vrai live) */}
        <LiveOverlay 
          session={session} 
          viewers={viewers} 
          isHost={isHost} 
          sessionId={sessionId}
          pinnedProduct={pinnedProduct}
          onUnpin={() => setPinnedProduct(null)}
        />
      </div>
    );
  }

  // Vrai rendu LiveKit
  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect={true}
      options={{ publishDefaults: { videoCodec: "vp9" } }}
      className="relative h-[100dvh] bg-black text-white overflow-hidden"
    >
      <VideoLayout isHost={isHost} />
      <LiveOverlay 
        session={session} 
        viewers={viewers} 
        isHost={isHost} 
        sessionId={sessionId}
        pinnedProduct={pinnedProduct}
        onUnpin={() => setPinnedProduct(null)}
      />
    </LiveKitRoom>
  );
}

// Composant séparé pour l'UI Overlay (réutilisé dans le fallback et le vrai LiveKit)
function LiveOverlay({ 
  session, viewers, isHost, sessionId, pinnedProduct, onUnpin 
}: any) {
  return (
    <>
      {/* Dégradé supérieur pour lisibilité */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent z-20 pointer-events-none" />
      
      {/* Badge LIVE + Spectateurs */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-red-600 px-3 py-1.5 rounded-lg shadow-lg">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-xs font-black tracking-wider">LIVE</span>
        </div>
        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <Users className="w-3.5 h-3.5 text-neutral-300" />
          <span className="text-xs font-bold">{viewers || session.viewers_count || 0}</span>
        </div>
      </div>

      {/* Info du Host (en haut à gauche sous le badge) */}
      <div className="absolute top-16 left-4 z-30 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden bg-neutral-800">
          {session.host_avatar ? (
            <img src={session.host_avatar} alt="Host" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-sm">
              {session.host_name?.charAt(0).toUpperCase() || "H"}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-bold text-white drop-shadow-md">{session.host_name || "Vendeur"}</p>
          <p className="text-xs text-neutral-300">{session.title || "Live Shopping"}</p>
        </div>
      </div>

      {/* Boutons d'action droite (Cadeaux / Produits) */}
      <div className="absolute bottom-24 right-4 z-30 flex flex-col gap-3">
        <button className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition">
          <Gift className="w-6 h-6 text-pink-500" />
        </button>
        {isHost && (
          <button 
            onClick={() => {/* Logique pour épingler un produit */}}
            className="w-12 h-12 rounded-full bg-red-500/90 backdrop-blur-md flex items-center justify-center active:scale-90 transition shadow-lg shadow-red-500/20"
          >
            <ShoppingBag className="w-6 h-6 text-white" />
          </button>
        )}
      </div>

      {/* Chat en temps réel */}
      <LiveChat sessionId={sessionId} />

      {/* Produit épinglé (style TikTok Shop) */}
      <LiveProductPin product={pinnedProduct} onClose={onUnpin} />
      
      {/* Dégradé inférieur pour lisibilité du chat */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />
    </>
  );
}

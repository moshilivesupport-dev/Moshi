"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Radio, Users, Gift, ShoppingBag, X, Coins, Mic, MicOff, RotateCcw } from "lucide-react";
import LiveChat from "./LiveChat";
import LiveProductPin from "./LiveProductPin";
import GiftPanel from "./GiftPanel";
import GiftAnimation from "./GiftAnimation";
import TopDonors from "./TopDonors";
import CoinShop from "@/components/coins/CoinShop";

interface LiveRoomProps {
  sessionId: string;
  isHost?: boolean;
  session?: any;
  token?: string;
  serverUrl?: string;
}

export default function LiveRoom({ sessionId, isHost = false, session: initialSession, token, serverUrl }: LiveRoomProps) {
  const supabase = createClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [session, setSession] = useState<any>(initialSession);
  const [viewers, setViewers] = useState(0);
  const [pinnedProduct, setPinnedProduct] = useState<any>(null);
  const [giftPanelOpen, setGiftPanelOpen] = useState(false);
  const [coinShopOpen, setCoinShopOpen] = useState(false);
  const [coinBalance, setCoinBalance] = useState(0);
  const [activeGift, setActiveGift] = useState<any>(null);
  const [giftCombo, setGiftCombo] = useState<Record<string, { count: number; timer: NodeJS.Timeout }>>({});
  
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [ending, setEnding] = useState(false);

  // Charger le solde de coins
  useEffect(() => {
    const loadBalance = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("user_coins").select("balance").eq("user_id", user.id).single();
      if (data) setCoinBalance(data.balance || 0);
    };
    loadBalance();
  }, [supabase]);

  // Charger les métadonnées du live
  useEffect(() => {
    if (session) return;
    supabase
      .from("live_sessions")
      .select(`*, profiles:host_id (id, username, full_name, avatar_url)`)
      .eq("id", sessionId)
      .single()
      .then(({ data }) => setSession(data));
  }, [sessionId, session, supabase]);

  // Activer la caméra si on est host
  useEffect(() => {
    if (!isHost) return;

    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: micOn,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraError(null);
      } catch (err: any) {
        console.error("Erreur caméra:", err);
        setCameraError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isHost, facingMode, micOn]);

  // Toggle micro
  const toggleMic = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !micOn;
      });
      setMicOn(!micOn);
    }
  };

  // Switch caméra avant/arrière
  const switchCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  // ✅ NOUVEAU : Fonction pour terminer le live
  const endLive = async () => {
    if (ending) return;
    
    if (!confirm("Voulez-vous vraiment terminer ce live ?")) return;

    setEnding(true);

    try {
      // Arrêter le flux vidéo
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Mettre à jour le statut en base de données
      await supabase
        .from("live_sessions")
        .update({ 
          status: "ended",
          ended_at: new Date().toISOString()
        })
        .eq("id", sessionId);

      // Rediriger vers la page des lives
      window.location.href = "/live";
    } catch (err) {
      console.error("Erreur lors de la fin du live:", err);
      alert("Erreur lors de la fermeture du live");
      setEnding(false);
    }
  };

  // Écouter les événements en temps réel
  useEffect(() => {
    const channel = supabase
      .channel(`live-room-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_sessions", filter: `id=eq.${sessionId}` },
        (payload: any) => {
          setViewers(payload.new.viewers_count || 0);
          if (payload.new.pinned_product_id) {
            setPinnedProduct({ id: "1", name: "Produit Démo", price: 29.99, image_url: "https://picsum.photos/100", stock: 15 });
          } else {
            setPinnedProduct(null);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_gifts", filter: `session_id=eq.${sessionId}` },
        async (payload: any) => {
          const gift = payload.new;
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", gift.sender_id)
            .single();

          const comboKey = `${gift.sender_id}-${gift.gift_type}`;
          if (giftCombo[comboKey]) {
            clearTimeout(giftCombo[comboKey].timer);
            const newCount = giftCombo[comboKey].count + 1;
            setGiftCombo(prev => ({
              ...prev,
              [comboKey]: {
                count: newCount,
                timer: setTimeout(() => {
                  setGiftCombo(prev => {
                    const next = { ...prev };
                    delete next[comboKey];
                    return next;
                  });
                }, 3000)
              }
            }));
            setActiveGift({ ...gift, sender_name: profile?.username, sender_avatar: profile?.avatar_url, combo: newCount });
          } else {
            setGiftCombo(prev => ({
              ...prev,
              [comboKey]: {
                count: 1,
                timer: setTimeout(() => {
                  setGiftCombo(prev => {
                    const next = { ...prev };
                    delete next[comboKey];
                    return next;
                  });
                }, 3000)
              }
            }));
            setActiveGift({ ...gift, sender_name: profile?.username, sender_avatar: profile?.avatar_url, combo: 1 });
          }

          setTimeout(() => setActiveGift(null), 4000);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, supabase, giftCombo]);

  if (!session) {
    return (
      <div className="h-[100dvh] bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] bg-black text-white overflow-hidden">
      {/* Flux caméra réel pour le host */}
      {isHost ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-900 via-black to-neutral-900">
          <div className="text-center p-6">
            <Radio className="w-20 h-20 text-red-500 mx-auto mb-4 animate-pulse" />
            <h2 className="text-xl font-bold mb-2">Live en cours</h2>
            <p className="text-sm text-neutral-400">Room: {session.room_name || sessionId}</p>
          </div>
        </div>
      )}

      {/* Erreur caméra */}
      {cameraError && (
        <div className="absolute top-20 left-4 right-4 z-50 bg-red-500/90 backdrop-blur-md px-4 py-3 rounded-xl text-sm text-white">
          ⚠️ {cameraError}
        </div>
      )}

      {/* Dégradés */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent z-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />

      {/* Header : LIVE + Spectateurs + Coins */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-red-600 px-3 py-1.5 rounded-lg shadow-lg">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-black tracking-wider">LIVE</span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
            <Users className="w-3.5 h-3.5 text-neutral-300" />
            <span className="text-xs font-bold">{viewers || session.viewers_count || 0}</span>
          </div>
          <button
            onClick={() => setCoinShopOpen(true)}
            className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-yellow-500/30"
          >
            <Coins className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-xs font-bold text-yellow-500">{coinBalance}</span>
          </button>
        </div>

        {/* ✅ Bouton fermer (pour les viewers) ou Terminer (pour le host) */}
        {isHost ? (
          <button
            onClick={endLive}
            disabled={ending}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-sm font-bold flex items-center gap-2 transition"
          >
            <X className="w-4 h-4" />
            {ending ? "Fermeture..." : "Terminer"}
          </button>
        ) : (
          <button
            onClick={() => window.history.back()}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {/* Top Donors */}
      <TopDonors sessionId={sessionId} />

      {/* Info du Host */}
      <div className="absolute top-16 left-4 z-30 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden bg-neutral-800">
          {session.profiles?.avatar_url ? (
            <img src={session.profiles.avatar_url} alt="Host" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-sm">
              {session.profiles?.username?.charAt(0).toUpperCase() || "H"}
            </div>
          )}
        </div>
        <div>
          <p className="text-sm font-bold text-white drop-shadow-md">
            {session.profiles?.username || "Vendeur"}
          </p>
          <p className="text-xs text-neutral-300">{session.title || "Live Shopping"}</p>
        </div>
      </div>

      {/* Contrôles caméra pour le host */}
      {isHost && (
        <div className="absolute bottom-40 right-4 z-30 flex flex-col gap-3">
          <button
            onClick={toggleMic}
            className={`w-12 h-12 rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition ${
              micOn ? "bg-black/40" : "bg-red-500/80"
            }`}
          >
            {micOn ? <Mic className="w-6 h-6 text-white" /> : <MicOff className="w-6 h-6 text-white" />}
          </button>
          <button
            onClick={switchCamera}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition"
          >
            <RotateCcw className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={() => setGiftPanelOpen(true)}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition"
          >
            <Gift className="w-6 h-6 text-pink-500" />
          </button>
          <button
            onClick={() => {/* Logique pour épingler un produit */}}
            className="w-12 h-12 rounded-full bg-red-500/90 backdrop-blur-md flex items-center justify-center active:scale-90 transition shadow-lg shadow-red-500/20"
          >
            <ShoppingBag className="w-6 h-6 text-white" />
          </button>
        </div>
      )}

      {/* Chat */}
      <LiveChat sessionId={sessionId} />

      {/* Produit épinglé */}
      <LiveProductPin product={pinnedProduct} onClose={() => setPinnedProduct(null)} />

      {/* Animation de cadeau */}
      <GiftAnimation activeGift={activeGift} />

      {/* Panneau de cadeaux */}
      <GiftPanel
        sessionId={sessionId}
        receiverId={session.host_id}
        isOpen={giftPanelOpen}
        onClose={() => setGiftPanelOpen(false)}
      />

      {/* Boutique de coins */}
      <CoinShop
        isOpen={coinShopOpen}
        onClose={() => setCoinShopOpen(false)}
        currentBalance={coinBalance}
        onBalanceUpdate={setCoinBalance}
      />
    </div>
  );
}

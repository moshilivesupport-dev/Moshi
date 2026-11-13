"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Radio, X, ShoppingBag, Send } from "lucide-react";

interface Product {
  id: string;
  title: string;
  price: number;
  currency: string | null;
  image_url: string | null;
}

interface MessageProfile {
  username: string;
  avatar_url: string | null;
}

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: MessageProfile | MessageProfile[] | null;
}

interface LiveRoomProps {
  liveId: string;
  roomName: string;
  isHost: boolean;
  products: Product[];
  isSellerLive: boolean;
}

export default function LiveRoom({
  liveId,
  roomName,
  isHost,
  products,
  isSellerLive,
}: LiveRoomProps) {
  const router = useRouter();
  const supabase = createClient();

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Charger le token LiveKit
  useEffect(() => {
    const fetchToken = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/auth/login");
          return;
        }
        setCurrentUser(user);

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
        const message = err instanceof Error ? err.message : "Erreur de connexion";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [roomName, supabase, router]);

  // 2. Charger messages + realtime
  useEffect(() => {
    const loadMessages = async () => {
      const { data } = await supabase
        .from("live_messages")
        .select(`
          id, user_id, content, created_at,
          profiles:user_id (username, avatar_url)
        `)
        .eq("live_id", liveId)
        .order("created_at", { ascending: true })
        .limit(50);

      const normalized: Message[] = (data || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        content: m.content,
        created_at: m.created_at,
        profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
      }));

      setMessages(normalized);
    };

    loadMessages();

    const channel = supabase
      .channel(`live_messages:${liveId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_messages",
          filter: `live_id=eq.${liveId}`,
        },
        async (payload: any) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", payload.new.user_id)
            .single();

          setMessages((prev) => [
            ...prev,
            { ...payload.new, profiles: profile },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [liveId, supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;
    const content = newMessage.trim();
    setNewMessage("");
    await supabase.from("live_messages").insert({
      live_id: liveId,
      user_id: currentUser.id,
      content,
    });
  };

  const handleLeave = async () => {
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
      <div className="min-h-[100dvh] bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
          <p className="text-white text-sm">Connexion au live...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Radio className="w-12 h-12 text-neutral-700" />
        <p className="text-white font-semibold">Live inaccessible</p>
        <p className="text-neutral-400 text-sm">{error}</p>
        <button onClick={() => router.back()} className="mt-4 px-6 py-2 bg-white text-black rounded-full font-semibold text-sm">
          Retour
        </button>
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="h-[100dvh] bg-black relative overflow-hidden" data-lk-theme="default">
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-4 pb-2 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2">
          <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">LIVE</div>
          {isSellerLive && (
            <div className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
              <ShoppingBag className="w-2.5 h-2.5" /> SHOPPING
            </div>
          )}
        </div>
        <button onClick={handleLeave} className="p-2">
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* ✅ CORRECTION : Spectateur ne publie pas sa caméra */}
      <LiveKitRoom
        video={isHost}
        audio={isHost}
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
        connect={true}
        onDisconnected={handleLeave}
        style={{ height: "100dvh" }}
      >
        <VideoConference />
        <RoomAudioRenderer />
        <ControlBar
          variation="minimal"
          controls={{
            camera: isHost,
            microphone: isHost,
            screenShare: false,
            chat: false,
            leave: true,
          }}
        />
      </LiveKitRoom>

      <div className="absolute bottom-20 left-4 right-4 z-20 max-h-[40vh] flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-1 mb-2 scrollbar-hide">
          {messages.map((msg) => {
            const profile = Array.isArray(msg.profiles) ? msg.profiles[0] : msg.profiles;
            return (
              <div key={msg.id} className="flex items-start gap-2">
                <span className="text-xs font-bold text-pink-400 flex-shrink-0">@{profile?.username || "user"}:</span>
                <span className="text-xs text-white">{msg.content}</span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex items-center gap-2 bg-black/60 backdrop-blur rounded-full px-3 py-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ajouter un commentaire..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-neutral-400"
          />
          <button onClick={sendMessage} className="p-1"><Send className="w-4 h-4 text-white" /></button>
        </div>
      </div>

      {isSellerLive && products.length > 0 && (
        <div className="absolute bottom-32 left-4 right-4 z-20">
          <div className="bg-black/70 backdrop-blur rounded-xl p-3 flex items-center gap-3 border border-purple-500/30">
            <div className="w-12 h-12 rounded-lg bg-neutral-800 flex items-center justify-center flex-shrink-0">
              {products[0].image_url ? (
                <img src={products[0].image_url} alt="" className="w-full h-full object-cover rounded-lg" />
              ) : (
                <ShoppingBag className="w-5 h-5 text-neutral-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{products[0].title}</p>
              <p className="text-xs text-green-400 font-semibold">{products[0].price.toFixed(2)} {products[0].currency || "€"}</p>
            </div>
            <button onClick={() => router.push(`/shop/${products[0].id}`)} className="bg-purple-600 text-white text-xs font-bold px-3 py-2 rounded-full">
              Acheter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
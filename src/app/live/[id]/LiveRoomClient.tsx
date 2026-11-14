"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { X, Users, Gift, Heart, Send, Mic, MicOff, Video, VideoOff, UserPlus } from "lucide-react";
import MoshiGiftPanel from "@/components/live/MoshiGiftPanel";

type Product = { id: string; title: string; price: number; currency: string | null; image_url: string | null };
type Message = { 
  id: string; 
  user_name: string; 
  user_avatar: string | null; 
  message: string; 
  created_at: string;
  type?: 'comment' | 'join' | 'follow';
};
type Props = { liveId: string; roomName: string; isHost: boolean; hostId?: string; products: Product[]; isSellerLive: boolean };
type FloatingHeart = { id: number; x: number; y: number };

export default function LiveRoomClient({ liveId, roomName, isHost, hostId, products, isSellerLive }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [showGifts, setShowGifts] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [notice, setNotice] = useState("");
  const [liveTitle, setLiveTitle] = useState("En direct sur Moshi");
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const heartIdRef = useRef(0);

  // 1. Récupérer l'utilisateur connecté
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getUser();
  }, [supabase]);

  // 2. Récupérer le token LiveKit
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/live/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomName }) });
        if (!res.ok) throw new Error("Impossible de rejoindre ce LIVE.");
        const data = await res.json();
        if (active) setToken(data.token);
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Erreur de connexion"); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [roomName]);

  // 3. Charger le live, les messages, et écouter en temps réel
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: live } = await supabase.from("live_sessions").select("title,viewers_count,likes_count").eq("id", liveId).maybeSingle();
      if (active && live) { 
        setLiveTitle(live.title || "En direct sur Moshi"); 
        setViewerCount(live.viewers_count || 0); 
        setLikeCount(live.likes_count || 0);
      }
      const { data } = await supabase.from("live_messages").select("id,user_name,user_avatar,message,created_at").eq("session_id", liveId).order("created_at", { ascending: true }).limit(40);
      if (active && data) {
        // On ajoute un type "comment" par défaut aux messages existants
        setMessages((data as Message[]).map(m => ({ ...m, type: 'comment' })));
      }
    })();

    const channel = supabase.channel(`moshi-live-${liveId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_messages", filter: `session_id=eq.${liveId}` }, payload => {
        if (active) setMessages(prev => [...prev.slice(-39), { ...(payload.new as Message), type: 'comment' }]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_sessions", filter: `id=eq.${liveId}` }, payload => {
        if (active) setLikeCount(payload.new.likes_count || 0);
      })
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [liveId, supabase]);

  // 4. Vérifier si l'utilisateur suit déjà l'hôte
  useEffect(() => {
    if (!currentUser || !hostId) return;
    const checkFollow = async () => {
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUser.id)
        .eq("following_id", hostId)
        .maybeSingle();
      setIsFollowing(!!data);
    };
    checkFollow();
  }, [currentUser, hostId, supabase]);

  // 5. Envoyer un message "a rejoint le live" quand on arrive
  useEffect(() => {
    if (!currentUser || isHost) return; // Pas de message pour l'hôte
    const announceJoin = async () => {
      // On attend 1 seconde pour laisser le temps à la page de charger
      await new Promise(r => setTimeout(r, 1000));
      
      const { data: profile } = await supabase.from("profiles").select("username,avatar_url").eq("id", currentUser.id).maybeSingle();
      
      // On ajoute le message localement (sans passer par la base de données)
      const joinMessage: Message = {
        id: `join-${Date.now()}`,
        user_name: profile?.username || "Utilisateur",
        user_avatar: profile?.avatar_url || null,
        message: "a rejoint le live",
        created_at: new Date().toISOString(),
        type: 'join'
      };
      setMessages(prev => [...prev, joinMessage]);
    };
    announceJoin();
  }, [currentUser, isHost, supabase]);

  const announce = useCallback((s: string) => { setNotice(s); window.setTimeout(() => setNotice(""), 2600); }, []);

  // 6. Fonction pour s'abonner
  const handleFollow = async () => {
    if (!currentUser) return announce("Connecte-toi pour suivre.");
    if (!hostId) return announce("Impossible de suivre cet hôte.");
    if (currentUser.id === hostId) return announce("Tu ne peux pas te suivre toi-même.");

    try {
      if (isFollowing) {
        await supabase.from("follows").delete().eq("follower_id", currentUser.id).eq("following_id", hostId);
        setIsFollowing(false);
      } else {
        await supabase.from("follows").insert({ follower_id: currentUser.id, following_id: hostId });
        setIsFollowing(true);

        // ✅ Ajouter un message "s'est abonné" dans le chat
        const { data: profile } = await supabase.from("profiles").select("username,avatar_url").eq("id", currentUser.id).maybeSingle();
        
        const followMessage: Message = {
          id: `follow-${Date.now()}`,
          user_name: profile?.username || "Utilisateur",
          user_avatar: profile?.avatar_url || null,
          message: "s'est abonné à l'hôte",
          created_at: new Date().toISOString(),
          type: 'follow'
        };
        setMessages(prev => [...prev, followMessage]);
      }
    } catch (err) {
      announce("Erreur lors de l'abonnement.");
    }
  };

  // 7. Envoyer un message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = draft.trim();
    if (!message) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return announce("Connecte-toi pour commenter.");
    const { data: profile } = await supabase.from("profiles").select("username,avatar_url").eq("id", user.id).maybeSingle();
    const { error } = await supabase.from("live_messages").insert({ session_id: liveId, user_id: user.id, user_name: profile?.username || "Utilisateur", user_avatar: profile?.avatar_url || null, message });
    if (error) announce("Message non envoyé."); else setDraft("");
  };

  const endLive = async () => {
    if (!isHost) return router.push("/live");
    if (!window.confirm("Terminer ce LIVE maintenant ?")) return;
    await supabase.from("live_sessions").update({ status: "ended" }).eq("id", liveId);
    router.push("/live");
  };

  const handleSendGift = async (gift: any) => {
    announce(`Cadeau ${gift.name} envoyé !`);
    setShowGifts(false);
  };

  // 8. Tapoter l'écran
  const handleScreenTap = async (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('form')) return;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const id = heartIdRef.current++;
    setFloatingHearts(prev => [...prev, { id, x: clientX, y: clientY }]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== id));
    }, 1000);

    try {
      const { data: liveData } = await supabase.from("live_sessions").select("likes_count").eq("id", liveId).single();
      if (liveData) {
        await supabase.from("live_sessions").update({ likes_count: (liveData.likes_count || 0) + 1 }).eq("id", liveId);
      }
    } catch (err) {
      console.error("Erreur like live:", err);
    }
  };

  if (loading) return <main className="h-[100dvh] bg-black text-white grid place-items-center">Connexion au LIVE…</main>;
  if (error || !token) return <main className="h-[100dvh] bg-black text-red-400 grid place-items-center">{error || "Jeton LIVE indisponible"}</main>;

  return (
    <main className="relative w-full h-[100dvh] bg-black overflow-hidden">
      <style>{`
        .moshi-livekit{position:absolute;inset:0}
        .moshi-live-video{position:absolute;inset:0;background:#090909}
        .moshi-live-video>div{height:100%;width:100%}
        .moshi-live-video [data-lk-theme]{height:100%;width:100%;--lk-bg:#080808}
        .moshi-live-video .lk-control-bar{display:none}
        .moshi-top-gradient{position:absolute;top:0;left:0;right:0;height:120px;background:linear-gradient(to bottom, rgba(0,0,0,0.7), transparent);pointer-events:none;z-index:10}
        .moshi-bottom-gradient{position:absolute;bottom:0;left:0;right:0;height:250px;background:linear-gradient(to top, rgba(0,0,0,0.9), transparent);pointer-events:none;z-index:10}
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          20% { transform: translateY(-20px) scale(1.2); opacity: 1; }
          100% { transform: translateY(-200px) scale(0.8); opacity: 0; }
        }
        .moshi-floating-heart {
          position: fixed;
          pointer-events: none;
          color: #ff2c55;
          font-size: 40px;
          animation: floatUp 1s ease-out forwards;
          z-index: 100;
          text-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
        .moshi-join-message {
          background: linear-gradient(90deg, rgba(255,44,85,0.2), rgba(139,92,246,0.2));
          border: 1px solid rgba(255,255,255,0.1);
        }
        .moshi-follow-message {
          background: linear-gradient(90deg, rgba(139,92,246,0.3), rgba(255,44,85,0.3));
          border: 1px solid rgba(255,255,255,0.2);
        }
      `}</style>
      
      <LiveKitRoom token={token} serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL} connect video={isHost} audio={isHost} onDisconnected={() => router.push("/live")} className="moshi-livekit">
        <div className="moshi-live-video">
          <VideoConference />
          <RoomAudioRenderer />
        </div>

        <div className="absolute inset-0 z-10" onClick={handleScreenTap} onTouchStart={handleScreenTap} />

        <div className="moshi-top-gradient" />
        <div className="moshi-bottom-gradient" />

        <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-5 pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold border-2 border-white/20">
              {(liveTitle[0] || "M").toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm">{liveTitle}</span>
              <span className="text-white/70 text-xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE
              </span>
            </div>
            {/* ✅ BOUTON SUIVRE */}
            {!isHost && (
              <button 
                onClick={handleFollow} 
                className={`ml-2 px-3 py-1.5 rounded-full text-xs font-bold transition ${
                  isFollowing 
                    ? "bg-white/20 text-white border border-white/30" 
                    : "bg-[#ff2c55] text-white"
                }`}
              >
                {isFollowing ? "Abonné" : "Suivre"}
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="bg-black/50 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-1.5 text-white text-xs font-semibold">
              <Users size={14} /> {viewerCount}
            </div>
            <div className="bg-black/50 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-1.5 text-white text-xs font-semibold">
              <Heart size={14} className="fill-pink-500 text-pink-500" /> {likeCount}
            </div>
            <button onClick={endLive} className="bg-black/50 backdrop-blur-md rounded-full p-2 text-white">
              <X size={20} />
            </button>
          </div>
        </header>

        <div className="absolute bottom-24 left-4 right-4 z-20 flex flex-col justify-end pointer-events-none">
          <div className="flex flex-col gap-2 max-h-[30vh] overflow-y-auto mb-3 pointer-events-auto">
            {messages.map(m => {
              // ✅ Style différent pour les messages "rejoint" et "abonné"
              if (m.type === 'join') {
                return (
                  <div key={m.id} className="moshi-join-message rounded-full px-3 py-1.5 text-xs w-fit flex items-center gap-1.5">
                    <UserPlus size={12} className="text-green-400" />
                    <span className="font-bold text-white">{m.user_name}</span>
                    <span className="text-white/70">{m.message}</span>
                  </div>
                );
              }
              if (m.type === 'follow') {
                return (
                  <div key={m.id} className="moshi-follow-message rounded-full px-3 py-1.5 text-xs w-fit flex items-center gap-1.5">
                    <Heart size={12} className="fill-pink-500 text-pink-500" />
                    <span className="font-bold text-white">{m.user_name}</span>
                    <span className="text-white/70">{m.message}</span>
                  </div>
                );
              }
              return (
                <div key={m.id} className="bg-black/40 backdrop-blur-sm rounded-2xl px-3 py-1.5 text-sm w-fit max-w-full">
                  <span className="font-bold text-pink-300 mr-2">{m.user_name}</span>
                  <span className="text-white">{m.message}</span>
                </div>
              );
            })}
          </div>
          
          <div className="flex items-center gap-2 pointer-events-auto">
            <form onSubmit={sendMessage} className="flex-1 flex items-center bg-black/50 backdrop-blur-md rounded-full px-4 py-2 border border-white/20">
              <input 
                value={draft} 
                onChange={e => setDraft(e.target.value)} 
                placeholder="Ajouter un commentaire..." 
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/50"
              />
              <button type="submit" disabled={!draft.trim()} className="text-white/70 disabled:opacity-50">
                <Send size={18} />
              </button>
            </form>
            <button onClick={() => setShowGifts(true)} className="bg-black/50 backdrop-blur-md rounded-full p-3 text-pink-500 border border-white/20">
              <Gift size={22} />
            </button>
            <button onClick={() => announce("❤️")} className="bg-black/50 backdrop-blur-md rounded-full p-3 text-white border border-white/20">
              <Heart size={22} />
            </button>
          </div>
        </div>

        {isHost && (
          <div className="absolute bottom-6 left-4 right-4 z-20 flex justify-center gap-4">
            <button onClick={() => setMuted(v => !v)} className="bg-black/50 backdrop-blur-md rounded-full p-3 text-white border border-white/20">
              {muted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
            <button onClick={() => setCameraOff(v => !v)} className="bg-black/50 backdrop-blur-md rounded-full p-3 text-white border border-white/20">
              {cameraOff ? <VideoOff size={22} /> : <Video size={22} />}
            </button>
          </div>
        )}

        {floatingHearts.map(h => (
          <div 
            key={h.id} 
            className="moshi-floating-heart" 
            style={{ left: h.x - 20, top: h.y - 20 }}
          >
            ❤️
          </div>
        ))}

        <MoshiGiftPanel open={showGifts} onClose={() => setShowGifts(false)} coinBalance={1000} onSend={handleSendGift} />

        {notice && <div className="absolute bottom-40 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm z-50">{notice}</div>}
      </LiveKitRoom>
    </main>
  );
}
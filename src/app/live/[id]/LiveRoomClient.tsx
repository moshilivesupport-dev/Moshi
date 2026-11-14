"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { X, Users, Gift, Heart, Send, Mic, MicOff, Video, VideoOff } from "lucide-react";
import MoshiGiftPanel from "@/components/live/MoshiGiftPanel";

type Product = { id: string; title: string; price: number; currency: string | null; image_url: string | null };
type Message = { id: string; user_name: string; user_avatar: string | null; message: string; created_at: string };
type Props = { liveId: string; roomName: string; isHost: boolean; hostId?: string; products: Product[]; isSellerLive: boolean };

export default function LiveRoomClient({ liveId, roomName, isHost, products, isSellerLive }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [showGifts, setShowGifts] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [notice, setNotice] = useState("");
  const [liveTitle, setLiveTitle] = useState("En direct sur Moshi");

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

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: live } = await supabase.from("live_sessions").select("title,viewers_count").eq("id", liveId).maybeSingle();
      if (active && live) { setLiveTitle(live.title || "En direct sur Moshi"); setViewerCount(live.viewers_count || 0); }
      const { data } = await supabase.from("live_messages").select("id,user_name,user_avatar,message,created_at").eq("session_id", liveId).order("created_at", { ascending: true }).limit(40);
      if (active && data) setMessages(data as Message[]);
    })();
    const channel = supabase.channel(`moshi-live-${liveId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "live_messages", filter: `session_id=eq.${liveId}` }, payload => {
      if (active) setMessages(prev => [...prev.slice(-39), payload.new as Message]);
    }).subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [liveId, supabase]);

  const announce = useCallback((s: string) => { setNotice(s); window.setTimeout(() => setNotice(""), 2600); }, []);

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
      `}</style>
      
      <LiveKitRoom token={token} serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL} connect video={isHost} audio={isHost} onDisconnected={() => router.push("/live")} className="moshi-livekit">
        <div className="moshi-live-video">
          <VideoConference />
          <RoomAudioRenderer />
        </div>

        <div className="moshi-top-gradient" />
        <div className="moshi-bottom-gradient" />

        {/* HEADER STYLE INSTAGRAM */}
        <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold border-2 border-white/20">
              {(liveTitle[0] || "M").toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm">{liveTitle}</span>
              <span className="text-white/70 text-xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="bg-black/50 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-1.5 text-white text-xs font-semibold">
              <Users size={14} /> {viewerCount}
            </div>
            <button onClick={endLive} className="bg-black/50 backdrop-blur-md rounded-full p-2 text-white">
              <X size={20} />
            </button>
          </div>
        </header>

        {/* CHAT STYLE INSTAGRAM */}
        <div className="absolute bottom-24 left-4 right-4 z-20 flex flex-col justify-end pointer-events-none">
          <div className="flex flex-col gap-2 max-h-[30vh] overflow-y-auto mb-3 pointer-events-auto">
            {messages.map(m => (
              <div key={m.id} className="bg-black/40 backdrop-blur-sm rounded-2xl px-3 py-1.5 text-sm w-fit max-w-full">
                <span className="font-bold text-pink-300 mr-2">{m.user_name}</span>
                <span className="text-white">{m.message}</span>
              </div>
            ))}
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

        {/* BOUTONS HOTE (Micro/Caméra) */}
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

        <MoshiGiftPanel open={showGifts} onClose={() => setShowGifts(false)} coinBalance={1000} onSend={handleSendGift} />

        {notice && <div className="absolute bottom-40 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm z-50">{notice}</div>}
      </LiveKitRoom>
    </main>
  );
}
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { X, Users, Gift, Heart, Share2, MoreHorizontal, Mic, MicOff, Video, VideoOff, UserPlus, Shield, ShoppingBag, Send, Settings, Ban, VolumeX, LayoutGrid, ChevronDown } from "lucide-react";
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
  const [showGuests, setShowGuests] = useState(false);
  const [showModeration, setShowModeration] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [keywordFilter, setKeywordFilter] = useState("");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(products[0] || null);
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
  const apiNeeded = (s: string) => announce(`${s} : API serveur à connecter.`);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = draft.trim();
    if (!message || !commentsEnabled) return;
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

  const handleSendGift = async (gift: any, quantity: number, totalCoins: number) => {
    announce(`Cadeau ${gift.name} envoyé ! (API à connecter pour le débit de coins)`);
    setShowGifts(false);
  };

  if (loading) return <main className="h-[100dvh] bg-black text-white grid place-items-center">Connexion au LIVE…</main>;
  if (error || !token) return <main className="h-[100dvh] bg-black text-red-400 grid place-items-center">{error || "Jeton LIVE indisponible"}</main>;

  return (
    <main className="relative w-full h-[100dvh] min-h-[560px] bg-[#050505] text-white overflow-hidden">
      <style>{`
        .moshi-live-top{position:absolute;z-index:20;top:0;left:0;right:0;padding:calc(env(safe-area-inset-top) + 12px) 14px 34px;display:flex;align-items:center;justify-content:space-between;gap:8px;background:linear-gradient(#000b,transparent);pointer-events:none}.moshi-live-top button,.moshi-live-top-actions>*{pointer-events:auto}
        .moshi-live-host{display:flex;align-items:center;gap:8px;min-width:0}.moshi-live-avatar{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#ff375f,#8b5cf6);font-weight:900}.moshi-live-host-copy{display:flex;flex-direction:column;min-width:0;max-width:38vw}.moshi-live-host-copy strong{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.moshi-live-host-copy span{font-size:10px;color:#ddd;letter-spacing:.08em}.moshi-follow{border:0;border-radius:99px;padding:7px 12px;background:#ff315b;color:white;font-size:11px;font-weight:800}
        .moshi-live-top-actions{display:flex;align-items:center;gap:7px}.moshi-live-top-actions button{border:0;background:#1119;color:white;border-radius:50%;width:32px;height:32px;display:grid;place-items:center}.moshi-live-pill,.moshi-viewers{background:#171717bb;border:1px solid #ffffff20;border-radius:99px;padding:6px 9px;font-size:10px;display:flex;align-items:center;gap:5px;white-space:nowrap}.moshi-live-pill i{width:6px;height:6px;border-radius:50%;background:#ff315b;box-shadow:0 0 8px #ff315b}
        .moshi-live-right-actions{position:absolute;z-index:20;right:10px;top:34%;display:flex;flex-direction:column;gap:15px}.moshi-live-right-actions button{border:0;background:transparent;color:white;display:flex;align-items:center;flex-direction:column;gap:3px;text-shadow:0 1px 5px #000}.moshi-live-right-actions svg{width:24px;height:24px;filter:drop-shadow(0 1px 4px #000)}.moshi-live-right-actions small{font-size:9px}
        .moshi-live-bottom{position:absolute;z-index:18;left:0;right:56px;bottom:0;padding:18px 10px calc(env(safe-area-inset-bottom) + 12px);background:linear-gradient(transparent,#0009 18%,#000c 100%)}.moshi-live-chat{display:flex;flex-direction:column;justify-content:flex-end;gap:7px;max-height:32dvh;overflow:auto;padding:10px 0}.moshi-chat-line{width:fit-content;max-width:100%;background:#0007;border-radius:14px;padding:6px 9px;font-size:12px;line-height:1.35;backdrop-filter:blur(8px)}.moshi-chat-line b{color:#ffd1dd;margin-right:6px}.moshi-chat-line span{overflow-wrap:anywhere}
        .moshi-live-controls{display:flex;align-items:center;gap:7px}.moshi-chat-form{height:40px;flex:1;min-width:0;display:flex;background:#ffffff24;border:1px solid #ffffff20;border-radius:99px;overflow:hidden}.moshi-chat-form input{flex:1;min-width:0;background:transparent;border:0;outline:0;color:white;padding:0 13px;font-size:12px}.moshi-chat-form input::placeholder{color:#ddd}.moshi-chat-form button{width:38px;border:0;background:transparent;color:white;display:grid;place-items:center}.moshi-round-control{width:37px;height:37px;flex:0 0 37px;border:0;border-radius:50%;background:#ffffff22;color:white;display:grid;place-items:center}.moshi-round-control svg{width:19px;height:19px}
        .moshi-product-pin{display:flex;align-items:center;gap:8px;padding:8px;border-radius:13px;background:#151515e8;border:1px solid #ffffff24;margin:0 0 5px;max-width:100%}.moshi-product-pin img,.moshi-product-placeholder{width:44px;height:44px;border-radius:8px;object-fit:cover;background:#333;display:grid;place-items:center}.moshi-product-copy{display:flex;flex:1;min-width:0;flex-direction:column;font-size:11px;gap:3px}.moshi-product-copy b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.moshi-product-copy strong{color:#69e6a3}.moshi-product-pin>button{border:0;border-radius:99px;background:#ff315b;color:white;font-weight:800;padding:8px 12px;font-size:11px}.moshi-product-pin select{max-width:84px;background:#222;color:white;border:1px solid #555;border-radius:8px;font-size:10px}
        .moshi-live-sheet{position:absolute;z-index:40;left:0;right:0;bottom:0;padding:18px 18px calc(env(safe-area-inset-bottom) + 20px);background:#171717;border-radius:22px 22px 0 0;box-shadow:0 -10px 40px #0008;max-height:65dvh;overflow:auto}.moshi-sheet-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.moshi-sheet-head button{border:0;background:transparent;color:white}.moshi-guest-layout{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:15px}.moshi-guest-layout>div{aspect-ratio:1;background:#282828;border:1px dashed #777;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:5px;color:#aaa;font-size:10px}.moshi-primary-action,.moshi-secondary-action{width:100%;padding:12px;border-radius:11px;margin-top:8px;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;gap:8px}.moshi-primary-action{border:0;background:#ff315b;color:white}.moshi-secondary-action{border:1px solid #ffffff22;background:#242424;color:white}.moshi-toggle-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;font-size:13px}.moshi-field-label{display:flex;flex-direction:column;gap:7px;font-size:12px;color:#bbb}.moshi-field-label input{padding:11px;border-radius:9px;background:#292929;border:1px solid #444;color:white}
        .moshi-live-more{position:absolute;z-index:35;right:12px;bottom:90px;width:210px;background:#171717;border:1px solid #ffffff20;border-radius:15px;padding:8px;display:flex;flex-direction:column;box-shadow:0 8px 30px #0008}.moshi-live-more button{border:0;background:transparent;color:white;text-align:left;padding:11px;font-size:12px;display:flex;align-items:center;gap:8px}.moshi-live-toast{position:absolute;z-index:60;left:50%;bottom:100px;transform:translateX(-50%);background:#222;color:white;border:1px solid #ffffff22;border-radius:99px;padding:10px 15px;font-size:12px;white-space:nowrap;max-width:90vw}
        .moshi-livekit{position:absolute;inset:0}.moshi-live-video{position:absolute;inset:0;background:#090909}.moshi-live-video>div{height:100%;width:100%}.moshi-live-video [data-lk-theme]{height:100%;width:100%;--lk-bg:#080808}.moshi-live-video .lk-control-bar{display:none}
      `}</style>
      <LiveKitRoom token={token} serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL} connect video={isHost} audio={isHost} onDisconnected={() => router.push("/live")} className="moshi-livekit">
        <div className="moshi-live-video"><VideoConference /><RoomAudioRenderer /></div>
        <header className="moshi-live-top">
          <div className="moshi-live-host"><div className="moshi-live-avatar">{(liveTitle[0] || "M").toUpperCase()}</div><div className="moshi-live-host-copy"><strong>{liveTitle}</strong><span>{isSellerLive ? "LIVE SHOPPING" : "MOSHI LIVE"}</span></div><button className="moshi-follow" onClick={() => apiNeeded("Suivre l'hôte")}>Suivre</button></div>
          <div className="moshi-live-top-actions"><span className="moshi-live-pill"><i/> EN DIRECT</span><span className="moshi-viewers"><Users size={14}/> {viewerCount.toLocaleString("fr-FR")}</span><button aria-label="Fermer" onClick={endLive}><X/></button></div>
        </header>
        <aside className="moshi-live-right-actions">
          <button onClick={() => setShowGuests(true)}><UserPlus/><small>Invités</small></button>
          <button onClick={() => setShowModeration(true)}><Shield/><small>Modérer</small></button>
          <button onClick={() => setShowMore(v => !v)}><MoreHorizontal/><small>Plus</small></button>
          <button onClick={() => apiNeeded("Partager le LIVE")}><Share2/><small>Partager</small></button>
        </aside>
        <section className="moshi-live-bottom">
          {isSellerLive && selectedProduct && <div className="moshi-product-pin">{selectedProduct.image_url ? <img src={selectedProduct.image_url} alt=""/> : <div className="moshi-product-placeholder"><ShoppingBag/></div>}<div className="moshi-product-copy"><b>{selectedProduct.title}</b><strong>{selectedProduct.price.toLocaleString("fr-FR")} {selectedProduct.currency || "XOF"}</strong></div><button onClick={() => apiNeeded("Achat du produit")}>Voir</button>{products.length > 1 && <select aria-label="Produit épinglé" value={selectedProduct.id} onChange={e => setSelectedProduct(products.find(p => p.id === e.target.value) || null)}>{products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select>}</div>}
          <div className="moshi-live-chat">{messages.map(m => <div className="moshi-chat-line" key={m.id}><b>{m.user_name}</b><span>{m.message}</span></div>)}</div>
          <div className="moshi-live-controls">
            <form className="moshi-chat-form" onSubmit={sendMessage}><input value={draft} onChange={e => setDraft(e.target.value)} placeholder={commentsEnabled ? "Ajouter un commentaire…" : "Commentaires désactivés"} disabled={!commentsEnabled} maxLength={300}/><button type="submit" disabled={!draft.trim() || !commentsEnabled} aria-label="Envoyer"><Send size={17}/></button></form>
            <button className="moshi-round-control" onClick={() => setShowGifts(v => !v)} aria-label="Cadeaux"><Gift/></button>
            <button className="moshi-round-control" onClick={() => announce("❤️")} aria-label="J'aime"><Heart/></button>
            {isHost && <>
              <button className="moshi-round-control" onClick={() => setMuted(v => !v)} aria-label="Micro">{muted ? <MicOff/> : <Mic/>}</button>
              <button className="moshi-round-control" onClick={() => setCameraOff(v => !v)} aria-label="Caméra">{cameraOff ? <VideoOff/> : <Video/>}</button>
            </>}
          </div>
        </section>

        <MoshiGiftPanel open={showGifts} onClose={() => setShowGifts(false)} coinBalance={1000} onSend={handleSendGift} />

        {showGuests && <div className="moshi-live-sheet"><div className="moshi-sheet-head"><b>Invités et co-animation</b><button onClick={() => setShowGuests(false)}><X/></button></div><div className="moshi-guest-layout">{[1,2,3].map(n => <div key={n}><UserPlus/><span>Place invité {n}</span></div>)}</div><button className="moshi-primary-action" onClick={() => apiNeeded("Invitation d'un invité")}>Inviter un invité</button><button className="moshi-secondary-action" onClick={() => apiNeeded("Demandes des spectateurs")}>Voir les demandes pour rejoindre</button><p>Disposition prévue : hôte + jusqu'à trois invités vidéo.</p></div>}
        {showModeration && <div className="moshi-live-sheet"><div className="moshi-sheet-head"><b>Outils de modération</b><button onClick={() => setShowModeration(false)}><X/></button></div><label className="moshi-toggle-row">Commentaires activés<input type="checkbox" checked={commentsEnabled} onChange={e => setCommentsEnabled(e.target.checked)}/></label><label className="moshi-field-label">Mots-clés à filtrer<input value={keywordFilter} onChange={e => setKeywordFilter(e.target.value)} placeholder="spam, insultes…"/></label><button className="moshi-primary-action" onClick={() => apiNeeded("Enregistrement des filtres")}>Appliquer le filtre</button><button className="moshi-secondary-action" onClick={() => apiNeeded("Gestion des modérateurs")}><Shield size={16}/> Gérer les modérateurs</button><button className="moshi-secondary-action" onClick={() => apiNeeded("Utilisateurs bloqués")}><Ban size={16}/> Utilisateurs bloqués</button><button className="moshi-secondary-action" onClick={() => apiNeeded("Mute d'un spectateur")}><VolumeX size={16}/> Mettre en sourdine</button></div>}
        {showMore && <div className="moshi-live-more"><button onClick={() => apiNeeded("Questions/Réponses")}>Questions & réponses</button><button onClick={() => apiNeeded("Statistiques LIVE")}>Statistiques du LIVE</button><button onClick={() => apiNeeded("Paramètres LIVE")}><Settings size={15}/> Paramètres</button><button onClick={() => apiNeeded("Disposition invités")}><LayoutGrid size={15}/> Disposition invités</button><button onClick={() => setShowMore(false)}>Fermer <ChevronDown size={15}/></button></div>}
        {notice && <div className="moshi-live-toast">{notice}</div>}
      </LiveKitRoom>
    </main>
  );
}
"use client";

import "../live-room.css";

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

  // ✅ Fonction d'envoi de cadeau (le débit réel sera connecté à une API)
  const handleSendGift = async (gift: any, quantity: number, totalCoins: number) => {
    announce(`Cadeau ${gift.name} envoyé ! (API à connecter pour le débit de coins)`);
    setShowGifts(false);
  };

  if (loading) return <main className="moshi-live-state">Connexion au LIVE…</main>;
  if (error || !token) return <main className="moshi-live-state moshi-live-error">{error || "Jeton LIVE indisponible"}</main>;

  return <main className="moshi-live-shell">
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

      {/* ✅ LE PANNEAU DE CADEAUX MOSHI */}
      <MoshiGiftPanel
        open={showGifts}
        onClose={() => setShowGifts(false)}
        coinBalance={1000}
        onSend={handleSendGift}
      />

      {showGuests && <div className="moshi-live-sheet"><div className="moshi-sheet-head"><b>Invités et co-animation</b><button onClick={() => setShowGuests(false)}><X/></button></div><div className="moshi-guest-layout">{[1,2,3].map(n => <div key={n}><UserPlus/><span>Place invité {n}</span></div>)}</div><button className="moshi-primary-action" onClick={() => apiNeeded("Invitation d'un invité")}>Inviter un invité</button><button className="moshi-secondary-action" onClick={() => apiNeeded("Demandes des spectateurs")}>Voir les demandes pour rejoindre</button><p>Disposition prévue : hôte + jusqu'à trois invités vidéo.</p></div>}
      {showModeration && <div className="moshi-live-sheet"><div className="moshi-sheet-head"><b>Outils de modération</b><button onClick={() => setShowModeration(false)}><X/></button></div><label className="moshi-toggle-row">Commentaires activés<input type="checkbox" checked={commentsEnabled} onChange={e => setCommentsEnabled(e.target.checked)}/></label><label className="moshi-field-label">Mots-clés à filtrer<input value={keywordFilter} onChange={e => setKeywordFilter(e.target.value)} placeholder="spam, insultes…"/></label><button className="moshi-primary-action" onClick={() => apiNeeded("Enregistrement des filtres")}>Appliquer le filtre</button><button className="moshi-secondary-action" onClick={() => apiNeeded("Gestion des modérateurs")}><Shield size={16}/> Gérer les modérateurs</button><button className="moshi-secondary-action" onClick={() => apiNeeded("Utilisateurs bloqués")}><Ban size={16}/> Utilisateurs bloqués</button><button className="moshi-secondary-action" onClick={() => apiNeeded("Mute d'un spectateur")}><VolumeX size={16}/> Mettre en sourdine</button></div>}
      {showMore && <div className="moshi-live-more"><button onClick={() => apiNeeded("Questions/Réponses")}>Questions & réponses</button><button onClick={() => apiNeeded("Statistiques LIVE")}>Statistiques du LIVE</button><button onClick={() => apiNeeded("Paramètres LIVE")}><Settings size={15}/> Paramètres</button><button onClick={() => apiNeeded("Disposition invités")}><LayoutGrid size={15}/> Disposition invités</button><button onClick={() => setShowMore(false)}>Fermer <ChevronDown size={15}/></button></div>}
      {notice && <div className="moshi-live-toast">{notice}</div>}
    </LiveKitRoom>
  </main>;
}
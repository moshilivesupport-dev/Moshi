"use client";

import { useMemo, useState } from "react";
import { Coins, X, Send } from "lucide-react";

export type MoshiGift = {
  id: string;
  name: string;
  emoji: string;
  price: number;
  category: "Populaires" | "Classiques" | "Animés" | "Premium" | "Événements";
  tier: "basic" | "animated" | "premium";
};

const CATALOG: MoshiGift[] = [
  { id: "rose", name: "Rose", emoji: "🌹", price: 5, category: "Populaires", tier: "basic" },
  { id: "heart", name: "Cœur", emoji: "💗", price: 10, category: "Populaires", tier: "basic" },
  { id: "coffee", name: "Café", emoji: "☕", price: 20, category: "Classiques", tier: "basic" },
  { id: "crown", name: "Couronne", emoji: "👑", price: 199, category: "Classiques", tier: "animated" },
  { id: "bouquet", name: "Bouquet", emoji: "💐", price: 299, category: "Animés", tier: "animated" },
  { id: "teddy", name: "Ours câlin", emoji: "🧸", price: 499, category: "Animés", tier: "animated" },
  { id: "sports-car", name: "Voiture sport", emoji: "🏎️", price: 2999, category: "Premium", tier: "premium" },
  { id: "rocket", name: "Fusée cosmique", emoji: "🚀", price: 5999, category: "Premium", tier: "premium" },
  { id: "castle", name: "Château de diamants", emoji: "🏰", price: 9999, category: "Premium", tier: "premium" },
  { id: "birthday", name: "Célébration", emoji: "🎂", price: 699, category: "Événements", tier: "animated" },
];

const TABS = ["Populaires", "Classiques", "Animés", "Premium", "Événements"] as const;
const QUANTITIES = [1, 10, 20, 50];

type Props = {
  open: boolean;
  onClose: () => void;
  coinBalance: number;
  onRecharge?: () => void;
  onSend: (gift: MoshiGift, quantity: number, totalCoins: number) => Promise<void> | void;
};

export default function MoshiGiftPanel({ open, onClose, coinBalance, onRecharge, onSend }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Populaires");
  const [selectedId, setSelectedId] = useState("rose");
  const [quantity, setQuantity] = useState(1);
  const [sending, setSending] = useState(false);
  const gifts = useMemo(() => CATALOG.filter(g => g.category === tab), [tab]);
  const selected = CATALOG.find(g => g.id === selectedId) ?? CATALOG[0];
  const total = selected.price * quantity;

  if (!open) return null;

  const chooseTab = (next: (typeof TABS)[number]) => {
    setTab(next);
    const first = CATALOG.find(g => g.category === next);
    if (first) setSelectedId(first.id);
    setQuantity(1);
  };

  const send = async () => {
    if (total > coinBalance || sending) return;
    setSending(true);
    try {
      await onSend(selected, quantity, total);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <style>{`
        .moshi-gift-backdrop{position:absolute;z-index:80;inset:0;background:#0008;display:flex;align-items:flex-end}
        .moshi-gift-panel{width:100%;max-height:76dvh;overflow:auto;background:#17151d;color:#fff;border-radius:22px 22px 0 0;padding:16px 14px calc(env(safe-area-inset-bottom) + 16px);box-shadow:0 -12px 44px #0009}
        .moshi-gift-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.moshi-gift-header>div{display:flex;flex-direction:column;gap:3px}.moshi-gift-header strong{font-size:16px}.moshi-gift-header small{font-size:11px;color:#aaa}.moshi-gift-header button{border:0;background:transparent;color:white}
        .moshi-gift-tabs{display:flex;gap:18px;overflow:auto;border-bottom:1px solid #ffffff18;margin:0 -14px 12px;padding:0 14px}.moshi-gift-tabs button{white-space:nowrap;border:0;border-bottom:2px solid transparent;background:transparent;color:#aaa;padding:9px 0;font-size:11px}.moshi-gift-tabs button.active{color:#fff;border-color:#ff4778;font-weight:800}
        .moshi-gift-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.moshi-gift-tile{position:relative;min-width:0;min-height:100px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;border:1px solid #ffffff12;border-radius:12px;background:#24212b;color:#fff;padding:8px 3px}.moshi-gift-tile.selected{border:1px solid #ff4b80;background:#392333;box-shadow:inset 0 0 0 1px #ff4b8033}.moshi-gift-art{font-size:32px;line-height:1.2;filter:drop-shadow(0 3px 5px #0008)}.moshi-gift-tile b{font-size:10px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.moshi-gift-tile small{display:flex;align-items:center;gap:3px;color:#f6cf78;font-size:10px}.moshi-gift-tile.premium{background:linear-gradient(145deg,#302346,#22202c)}.moshi-gift-tile i{font-style:normal;color:#f7c86b;font-size:7px;letter-spacing:.04em}
        .moshi-gift-selection{display:flex;align-items:center;gap:10px;padding:12px 0;border-top:1px solid #ffffff18;margin-top:12px}.moshi-gift-preview{width:54px;height:54px;flex:0 0 54px;border-radius:13px;display:grid;place-items:center;background:#302432}.moshi-gift-preview span{font-size:34px}.moshi-gift-preview.premium{background:linear-gradient(145deg,#62419b,#27233d)}.moshi-gift-selected-copy{display:flex;flex:1;min-width:0;flex-direction:column;gap:3px}.moshi-gift-selected-copy b{font-size:12px}.moshi-gift-selected-copy small{font-size:9px;color:#aaa}.moshi-gift-selected-copy strong{display:flex;align-items:center;gap:4px;color:#f6cf78;font-size:10px}
        .moshi-gift-quantity{display:flex;gap:4px}.moshi-gift-quantity button{border:1px solid #ffffff20;background:#282530;color:#ddd;border-radius:7px;padding:6px 7px;font-size:9px}.moshi-gift-quantity button.active{border-color:#ff4778;background:#49283a;color:white}
        .moshi-gift-footer{display:flex;gap:8px;align-items:center}.moshi-gift-wallet{display:flex;align-items:center;gap:7px;border:1px solid #ffffff20;background:#27242e;color:white;border-radius:11px;padding:8px 10px}.moshi-gift-wallet>svg{color:#f6cf78}.moshi-gift-wallet span:not(.plus){display:flex;flex-direction:column;text-align:left}.moshi-gift-wallet b{font-size:11px}.moshi-gift-wallet small{font-size:8px;color:#aaa}.moshi-gift-wallet .plus{color:#ff7ba0;font-weight:900;font-size:18px}.moshi-gift-send{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:11px;background:linear-gradient(90deg,#ff4778,#e52e69);color:white;padding:13px 8px;font-size:11px;font-weight:900}.moshi-gift-send:disabled{opacity:.4}.moshi-gift-insufficient{color:#ff91a8;font-size:10px;margin:8px 2px 0}
      `}</style>
      <div className="moshi-gift-backdrop" role="dialog" aria-modal="true" aria-label="Cadeaux LIVE">
        <section className="moshi-gift-panel">
          <header className="moshi-gift-header">
            <div><strong>Envoyer un cadeau</strong><small>Fais briller le LIVE ✨</small></div>
            <button onClick={onClose} aria-label="Fermer"><X /></button>
          </header>
          <nav className="moshi-gift-tabs">
            {TABS.map(t => <button key={t} className={tab === t ? "active" : ""} onClick={() => chooseTab(t)}>{t}</button>)}
          </nav>
          <div className="moshi-gift-grid">
            {gifts.map(g => <button key={g.id} className={`moshi-gift-tile ${selectedId === g.id ? "selected" : ""} ${g.tier}`} onClick={() => setSelectedId(g.id)}>
              <span className="moshi-gift-art">{g.emoji}</span>
              <b>{g.name}</b>
              <small><Coins size={12}/>{g.price.toLocaleString("fr-FR")}</small>
              {g.tier === "premium" && <i>EFFET SPÉCIAL</i>}
            </button>)}
          </div>
          <div className="moshi-gift-selection">
            <div className={`moshi-gift-preview ${selected.tier}`}><span>{selected.emoji}</span></div>
            <div className="moshi-gift-selected-copy"><b>{selected.name}</b><small>{selected.tier === "premium" ? "Animation spectaculaire" : selected.tier === "animated" ? "Cadeau animé" : "Cadeau classique"}</small><strong><Coins size={14}/>{selected.price.toLocaleString("fr-FR")} coins</strong></div>
            <div className="moshi-gift-quantity">{QUANTITIES.map(q => <button key={q} className={quantity === q ? "active" : ""} onClick={() => setQuantity(q)}>{q}</button>)}</div>
          </div>
          <footer className="moshi-gift-footer">
            <button className="moshi-gift-wallet" onClick={onRecharge}><Coins/><span><b>{coinBalance.toLocaleString("fr-FR")}</b><small>Mon solde</small></span><span className="plus">+</span></button>
            <button className="moshi-gift-send" disabled={total > coinBalance || sending} onClick={send}>
              {sending ? "Envoi…" : <><Send size={16}/> Envoyer · {total.toLocaleString("fr-FR")}</>}
            </button>
          </footer>
          {total > coinBalance && <p className="moshi-gift-insufficient">Solde insuffisant. Recharge tes coins pour envoyer ce cadeau.</p>}
        </section>
      </div>
    </>
  );
}
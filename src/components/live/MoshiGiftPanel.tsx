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

  return <div className="moshi-gift-backdrop" role="dialog" aria-modal="true" aria-label="Cadeaux LIVE">
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
  </div>;
}
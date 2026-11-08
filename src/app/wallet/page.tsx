"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Coins, CreditCard } from "lucide-react";
import { formatCurrency } from "@/lib/currency";

const PACKS = [
  { coins: 100, price: 500, currency: "XOF" as const },
  { coins: 500, price: 2000, currency: "XOF" as const },
  { coins: 1200, price: 4500, currency: "XOF" as const },
  { coins: 3000, price: 10000, currency: "XOF" as const },
];

export default function WalletPage() {
  const [balance] = useState(0); // Replace with real fetch

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Coins className="w-6 h-6 text-champagne" /> Portefeuille Coins
      </h1>

      <div className="card text-center py-8 mb-8 bg-gradient-to-br from-anthracite to-onyx border-champagne/20">
        <p className="text-muted text-sm mb-1">Solde actuel</p>
        <p className="text-4xl font-bold text-champagne">{balance.toLocaleString()}</p>
        <p className="text-xs text-muted mt-1">coins</p>
      </div>

      <h2 className="text-lg font-semibold text-white mb-4">Recharger</h2>
      <div className="grid grid-cols-2 gap-3">
        {PACKS.map((p) => (
          <button
            key={p.coins}
            className="card hover:border-coral/40 transition text-left"
          >
            <p className="text-2xl font-bold text-white">{p.coins}</p>
            <p className="text-xs text-muted mb-2">coins</p>
            <p className="text-sm text-champagne font-semibold">
              {formatCurrency(p.price, p.currency)}
            </p>
          </button>
        ))}
      </div>

      <p className="text-xs text-muted text-center mt-6">
        Paiement sécurisé (Stripe / Mobile Money à brancher)
      </p>
    </div>
  );
}

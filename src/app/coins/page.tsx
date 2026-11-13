"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ChevronLeft, Coins, Loader2, AlertCircle, Gift, Check
} from "lucide-react";
import { useCoins, type CoinPack } from "@/hooks/useCoins";
import { cn } from "@/lib/utils";

export default function CoinsPage() {
  const router = useRouter();
  const { packs, loading, purchasing, purchasePack, currentBalance, error } = useCoins();
  const [selectedPack, setSelectedPack] = useState<CoinPack | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handlePurchase = async (pack: CoinPack) => {
    setSelectedPack(pack);
    const result = await purchasePack(pack);
    
    if (result.success) {
      setSuccessMessage(`+${pack.coins + pack.bonus_coins} pièces ajoutées !`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
    setSelectedPack(null);
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-black flex items-center justify-between px-4 py-3">
        <button onClick={() => router.back()} className="p-2">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-semibold">Pièces</h1>
        <div className="w-10" />
      </header>

      {/* Solde actuel */}
      <div className="px-4 mb-6">
        <div className="bg-gradient-to-br from-yellow-900/30 to-neutral-900 border border-yellow-700/30 rounded-2xl p-5 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
            <Coins className="w-6 h-6 text-black" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-neutral-400">Solde actuel</p>
            <p className="text-2xl font-bold">{currentBalance.toLocaleString("fr-FR")}</p>
          </div>
          <span className="text-sm text-neutral-400">pièces</span>
        </div>
      </div>

      {/* Offre première recharge */}
      {packs.find((p) => p.is_first_purchase_only) && (
        <div className="px-4 mb-4">
          <div className="bg-gradient-to-r from-pink-600 to-pink-500 rounded-2xl p-4 flex items-center gap-3">
            <Gift className="w-10 h-10 text-white flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Offre de première recharge</p>
              <p className="text-xs text-white/80 mt-0.5">
                +50% de pièces bonus sur ton premier achat
              </p>
            </div>
            <button
              onClick={() => {
                const firstPack = packs.find((p) => p.is_first_purchase_only);
                if (firstPack) handlePurchase(firstPack);
              }}
              className="bg-white text-pink-600 font-bold text-xs px-3 py-2 rounded-lg flex-shrink-0"
            >
              Profiter
            </button>
          </div>
        </div>
      )}

      {/* Liste des packs */}
      <div className="px-4 mb-6">
        <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3">
          Acheter des pièces
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {packs.filter((p) => !p.is_first_purchase_only).map((pack) => {
              const isSelected = selectedPack?.id === pack.id;
              return (
                <button
                  key={pack.id}
                  onClick={() => handlePurchase(pack)}
                  disabled={purchasing}
                  className={cn(
                    "relative bg-neutral-900 border rounded-xl p-4 flex flex-col items-center gap-1 active:scale-95 transition disabled:opacity-50",
                    pack.is_popular
                      ? "border-yellow-500 ring-2 ring-yellow-500/30"
                      : "border-neutral-800"
                  )}
                >
                  {/* Badge populaire */}
                  {pack.is_popular && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                      POPULAIRE
                    </span>
                  )}

                  {/* Bonus */}
                  {pack.bonus_coins > 0 && (
                    <span className="absolute top-2 right-2 bg-pink-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      +{pack.bonus_coins}
                    </span>
                  )}

                  {/* Icône pièce */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mb-1">
                    <Coins className="w-5 h-5 text-black" />
                  </div>

                  {/* Nom */}
                  <p className="text-xs text-neutral-400">{pack.name}</p>

                  {/* Quantité */}
                  <p className="text-xl font-bold">{pack.coins}</p>

                  {/* Prix */}
                  <p className="text-sm font-semibold text-green-400">
                    {(pack.price_usd || 0).toFixed(2)} €
                  </p>

                  {isSelected && purchasing && (
                    <Loader2 className="w-5 h-5 animate-spin text-white mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Erreur */}
      {error && (
        <div className="mx-4 mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Footer */}
      <p className="text-center text-[10px] text-neutral-600 px-4">
        Les pièces sont virtuelles et ne peuvent pas être échangées contre de l'argent réel.
      </p>

      {/* Message de succès */}
      {successMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-full font-semibold text-sm shadow-lg flex items-center gap-2">
          <Check className="w-5 h-5" />
          {successMessage}
        </div>
      )}
    </div>
  );
}
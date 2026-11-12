"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Coins, X, Check, Zap, Crown, Rocket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CoinPack {
  id: string;
  coins: number;
  price: number;
  bonus?: number;
  icon: React.ReactNode;
  popular?: boolean;
  bestValue?: boolean;
}

const COIN_PACKS: CoinPack[] = [
  { id: "starter", coins: 100, price: 0.99, icon: <Coins className="w-8 h-8" /> },
  { id: "basic", coins: 500, price: 4.99, bonus: 50, icon: <Zap className="w-8 h-8" /> },
  { id: "popular", coins: 1200, price: 9.99, bonus: 200, popular: true, icon: <Crown className="w-8 h-8" /> },
  { id: "premium", coins: 3000, price: 24.99, bonus: 600, icon: <Rocket className="w-8 h-8" /> },
  { id: "whale", coins: 7000, price: 49.99, bonus: 2000, bestValue: true, icon: <Crown className="w-8 h-8" /> },
];

interface CoinShopProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onBalanceUpdate: (newBalance: number) => void;
}

export default function CoinShop({ isOpen, onClose, currentBalance, onBalanceUpdate }: CoinShopProps) {
  const supabase = createClient();
  const [selectedPack, setSelectedPack] = useState<CoinPack | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePurchase = async (pack: CoinPack) => {
    setSelectedPack(pack);
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Connectez-vous pour acheter des coins");
        return;
      }

      // TODO: Intégrer Stripe ici
      // Pour l'instant, on simule l'achat en créditant directement
      const totalCoins = pack.coins + (pack.bonus || 0);
      
      const { error } = await supabase
        .from("user_coins")
        .update({ 
          balance: currentBalance + totalCoins,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id);

      if (error) throw error;

      onBalanceUpdate(currentBalance + totalCoins);
      setSuccess(true);
      
      setTimeout(() => {
        setSuccess(false);
        setSelectedPack(null);
        setProcessing(false);
      }, 1500);

    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'achat");
      setProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-b from-neutral-900 to-black rounded-t-3xl border-t border-neutral-800 max-h-[85vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-800">
              <div>
                <h2 className="text-lg font-bold text-white">Boutique de coins</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Solde actuel : <span className="text-yellow-500 font-bold">{currentBalance.toLocaleString("fr-FR")} coins</span>
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 transition"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Message de succès */}
            {success && selectedPack && (
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mx-4 mt-4 bg-green-500/20 border border-green-500/30 rounded-xl p-3 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Achat réussi !</p>
                  <p className="text-xs text-green-400">
                    +{(selectedPack.coins + (selectedPack.bonus || 0)).toLocaleString("fr-FR")} coins ajoutés
                  </p>
                </div>
              </motion.div>
            )}

            {/* Liste des packs */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {COIN_PACKS.map((pack) => {
                const isSelected = selectedPack?.id === pack.id;
                const totalCoins = pack.coins + (pack.bonus || 0);

                return (
                  <button
                    key={pack.id}
                    onClick={() => !processing && handlePurchase(pack)}
                    disabled={processing}
                    className={`relative w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                      isSelected
                        ? "border-yellow-500 bg-yellow-500/10"
                        : "border-neutral-800 bg-neutral-900/50 hover:border-neutral-700"
                    } ${processing && !isSelected ? "opacity-50" : ""} active:scale-98`}
                  >
                    {/* Badge populaire */}
                    {pack.popular && (
                      <div className="absolute -top-2 right-4 bg-gradient-to-r from-pink-500 to-red-500 px-2 py-0.5 rounded-full text-[10px] font-bold text-white">
                        POPULAIRE
                      </div>
                    )}
                    {pack.bestValue && (
                      <div className="absolute -top-2 right-4 bg-gradient-to-r from-yellow-500 to-orange-500 px-2 py-0.5 rounded-full text-[10px] font-bold text-white">
                        MEILLEUR RAPPORT
                      </div>
                    )}

                    {/* Icône */}
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "bg-yellow-500 text-black" : "bg-gradient-to-br from-yellow-500/20 to-orange-500/20 text-yellow-500"
                    }`}>
                      {pack.icon}
                    </div>

                    {/* Infos */}
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white">
                          {totalCoins.toLocaleString("fr-FR")}
                        </span>
                        <Coins className="w-4 h-4 text-yellow-500" />
                      </div>
                      {pack.bonus && (
                        <p className="text-xs text-green-400 font-semibold mt-0.5">
                          +{pack.bonus} bonus inclus
                        </p>
                      )}
                    </div>

                    {/* Prix */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">{pack.price}€</p>
                      {processing && isSelected && (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mt-1" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer légal */}
            <div className="px-4 py-3 border-t border-neutral-800 text-center">
              <p className="text-[10px] text-neutral-500">
                Les coins sont non remboursables et valables uniquement sur Moshi.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

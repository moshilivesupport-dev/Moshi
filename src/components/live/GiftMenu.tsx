"use client";

import { useEffect, useState } from "react";
import { X, Coins, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useWallet } from "@/hooks/useWallet";

interface Gift {
  id: string;
  name: string;
  emoji: string;
  price_coins: number;
}

interface GiftMenuProps {
  liveId: string;
  receiverId: string;
  onClose: () => void;
  onGiftSent: (gift: Gift) => void;
}

export default function GiftMenu({ liveId, receiverId, onClose, onGiftSent }: GiftMenuProps) {
  const supabase = createClient();
  const { wallet, reload: reloadWallet } = useWallet();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    const loadGifts = async () => {
      const { data } = await supabase.from("gifts").select("*").order("price_coins", { ascending: true });
      setGifts(data || []);
      setLoading(false);
    };
    loadGifts();
  }, [supabase]);

  const sendGift = async (gift: Gift) => {
    if (!wallet || wallet.coins_balance < gift.price_coins) {
      alert("Solde de pièces insuffisant ! Va dans le Wallet pour recharger.");
      return;
    }

    setSendingId(gift.id);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      // 1. Déduire les pièces de l'acheteur
      await supabase
        .from("wallets")
        .update({ coins_balance: wallet.coins_balance - gift.price_coins })
        .eq("user_id", user.id);

      // 2. Ajouter les pièces au vendeur (90% pour le vendeur, 10% commission Moshi)
      const { data: sellerWallet } = await supabase
        .from("wallets")
        .select("coins_balance")
        .eq("user_id", receiverId)
        .single();

      const coinsForSeller = Math.floor(gift.price_coins * 0.9);
      
      if (sellerWallet) {
        await supabase
          .from("wallets")
          .update({ coins_balance: sellerWallet.coins_balance + coinsForSeller })
          .eq("user_id", receiverId);
      }

      // 3. Enregistrer le cadeau dans l'historique
      await supabase.from("live_gifts").insert({
        live_id: liveId,
        sender_id: user.id,
        receiver_id: receiverId,
        gift_id: gift.id,
        quantity: 1,
      });

      // 4. Mettre à jour le solde local
      await reloadWallet();

      // 5. Déclencher l'animation
      onGiftSent(gift);
      onClose();

    } catch (err) {
      alert("Erreur lors de l'envoi du cadeau");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#121212] rounded-t-3xl p-4 pb-8 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Envoyer un cadeau</h2>
          <button onClick={onClose} className="p-1"><X className="w-6 h-6 text-neutral-400" /></button>
        </div>

        {/* Solde */}
        <div className="bg-neutral-900 rounded-xl p-3 flex items-center gap-2 mb-4">
          <Coins className="w-5 h-5 text-yellow-500" />
          <span className="text-white text-sm">Ton solde :</span>
          <span className="text-yellow-500 font-bold ml-auto">{wallet?.coins_balance || 0} pièces</span>
        </div>

        {/* Grille de cadeaux */}
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-neutral-500 animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {gifts.map((gift) => (
              <button
                key={gift.id}
                onClick={() => sendGift(gift)}
                disabled={sendingId === gift.id}
                className="bg-neutral-900 hover:bg-neutral-800 rounded-xl p-2 flex flex-col items-center gap-1 active:scale-95 transition disabled:opacity-50"
              >
                <span className="text-3xl">{gift.emoji}</span>
                <span className="text-[10px] text-white font-semibold text-center">{gift.name}</span>
                <span className="text-[10px] text-yellow-500 font-bold flex items-center gap-0.5">
                  {sendingId === gift.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <>{gift.price_coins} <Coins className="w-3 h-3" /></>}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWallet } from "./useWallet";

export interface CoinPack {
  id: string;
  name: string;
  coins: number;
  bonus_coins: number;
  price_usd: number;
  is_popular: boolean;
  is_first_purchase_only: boolean;
  display_order: number;
}

export function useCoins() {
  const supabase = createClient();
  const { wallet, reload: reloadWallet } = useWallet();
  
  const [packs, setPacks] = useState<CoinPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPacks = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("coin_packs")
      .select("*")
      .order("display_order", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setPacks(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadPacks();
  }, [loadPacks]);

  const purchasePack = async (pack: CoinPack) => {
    setPurchasing(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      // ⚠️ ICI : Dans une vraie app, on redirigerait vers Cinetpay/Stripe
      // Pour l'instant, on simule un paiement réussi (à remplacer plus tard)
      
      // 1. Enregistrer la transaction
      const { error: txError } = await supabase
        .from("coin_transactions")
        .insert({
          user_id: user.id,
          pack_id: pack.id,
          coins_amount: pack.coins + pack.bonus_coins,
          price_paid: pack.price_usd,
          status: "completed",
          payment_method: "simulated",
        });

      if (txError) throw txError;

      // 2. Créditer le wallet
      const { error: walletError } = await supabase
        .from("wallets")
        .update({
          coins_balance: (wallet?.coins_balance || 0) + pack.coins + pack.bonus_coins,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (walletError) throw walletError;

      // 3. Recharger le wallet
      await reloadWallet();

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur d'achat";
      setError(message);
      return { success: false, error: message };
    } finally {
      setPurchasing(false);
    }
  };

  return {
    packs,
    loading,
    purchasing,
    error,
    purchasePack,
    reload: loadPacks,
    currentBalance: wallet?.coins_balance || 0,
  };
}
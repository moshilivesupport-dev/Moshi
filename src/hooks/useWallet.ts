"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface WalletData {
  id: string;
  user_id: string;
  coins_balance: number;
  usd_balance: number;
}

export function useWallet() {
  const supabase = createClient();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 = pas de ligne trouvée
        throw fetchError;
      }

      if (!data) {
        // Créer un wallet vide si n'existe pas
        const { data: newWallet, error: createError } = await supabase
          .from("wallets")
          .insert({ user_id: user.id, coins_balance: 0, usd_balance: 0 })
          .select()
          .single();
        
        if (createError) throw createError;
        setWallet(newWallet);
      } else {
        setWallet(data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur de chargement du portefeuille";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  return { wallet, loading, error, reload: loadWallet };
}
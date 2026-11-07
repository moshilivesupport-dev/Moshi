"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useWallet(userId?: string) {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    supabase
      .from("coins_wallet")
      .select("balance")
      .eq("user_id", userId)
      .single()
      .then(({ data }) => {
        setBalance(data?.balance ?? 0);
        setLoading(false);
      });
  }, [userId]);

  const refresh = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("coins_wallet")
      .select("balance")
      .eq("user_id", userId)
      .single();
    setBalance(data?.balance ?? 0);
  };

  return { balance, loading, refresh };
}

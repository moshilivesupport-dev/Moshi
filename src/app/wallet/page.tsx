
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Coins,
  Loader2,
  Sparkles,
  TrendingUp,
  LockKeyhole,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CoinPack {
  id: string;
  coins: number;
  price_fcfa: number;
  bonus: number;
  is_popular: boolean;
}

export default function WalletPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [balance, setBalance] = useState(0);
  const [packs, setPacks] = useState<CoinPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [paymentNotice, setPaymentNotice] = useState(
    "La recharge sera disponible dès l’activation du paiement sécurisé."
  );

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setLoadError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          router.replace("/auth/login");
          return;
        }

        const { data: wallet, error: walletError } = await supabase
          .from("wallets")
          .select("coins_balance")
          .eq("user_id", user.id)
          .maybeSingle();

        if (walletError) throw walletError;

        const { data: packsData, error: packsError } = await supabase
          .from("coin_packs")
          .select("id,coins,price_fcfa,bonus,is_popular")
          .order("price_fcfa", { ascending: true });

        if (packsError) throw packsError;

        if (cancelled) return;

        setBalance(Number(wallet?.coins_balance ?? 0));
        setPacks((packsData || []).map((pack) => ({
          ...pack,
          coins: Number(pack.coins || 0),
          bonus: Number(pack.bonus || 0),
          price_fcfa: Number(pack.price_fcfa || 0),
          is_popular: Boolean(pack.is_popular),
        })));
      } catch (error) {
        console.error("Erreur portefeuille :", error);

        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Impossible de charger le portefeuille."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  const handleBuy = () => {
    setPaymentNotice(
      "Recharge temporairement indisponible. Aucun montant ni coin n’a été débité ou crédité."
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-moshi-bg">
        <Loader2 className="h-10 w-10 animate-spin text-moshi-purple" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-moshi-bg pb-10">
      <header className="sticky top-0 z-20 flex items-center bg-white px-4 py-4 shadow-sm">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full p-2"
          aria-label="Retour"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="ml-2 text-lg font-bold">Mon portefeuille</h1>
      </header>

      <div className="p-6">
        <div className="moshi-gradient relative overflow-hidden rounded-3xl p-6 text-white shadow-xl shadow-purple-200/50">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

          <p className="relative mb-1 text-sm font-semibold text-white/80">
            Ton solde disponible
          </p>

          <div className="relative flex items-center gap-2">
            <Coins className="h-8 w-8 text-yellow-300" />
            <span className="text-4xl font-extrabold">
              {balance.toLocaleString("fr-FR")}
            </span>
            <span className="mt-2 text-sm font-semibold text-white/80">
              coins
            </span>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="mx-6 mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {loadError}
        </div>
      )}

      <div className="px-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-moshi-text">
            Recharger mes coins
          </h2>

          <div className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-500">
            <LockKeyhole size={12} />
            Paiement sécurisé
          </div>
        </div>

        {packs.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500">
            Aucun pack de coins disponible pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {packs.map((pack) => {
              const totalCoins = pack.coins + pack.bonus;
              const pricePerCoin =
                totalCoins > 0 ? pack.price_fcfa / totalCoins : 0;

              return (
                <div
                  key={pack.id}
                  className={cn(
                    "relative flex items-center justify-between gap-3 rounded-2xl border-2 bg-white p-4 shadow-sm",
                    pack.is_popular
                      ? "border-moshi-purple"
                      : "border-transparent"
                  )}
                >
                  {pack.is_popular && (
                    <span className="absolute -top-2.5 left-4 flex items-center gap-1 rounded-full bg-moshi-purple px-2 py-0.5 text-[9px] font-bold text-white">
                      <Sparkles size={10} />
                      MEILLEUR CHOIX
                    </span>
                  )}

                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
                        pack.is_popular
                          ? "moshi-gradient text-white"
                          : "bg-yellow-50 text-yellow-600"
                      )}
                    >
                      <Coins size={28} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xl font-extrabold text-moshi-text">
                        {totalCoins.toLocaleString("fr-FR")}
                        <span className="ml-1 text-xs font-semibold text-gray-400">
                          coins
                        </span>
                      </p>

                      {pack.bonus > 0 && (
                        <p className="text-[10px] font-bold text-green-500">
                          +{pack.bonus.toLocaleString("fr-FR")} offerts
                        </p>
                      )}

                      <p className="mt-0.5 text-[10px] text-gray-400">
                        {pricePerCoin.toFixed(2)} FCFA / coin
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleBuy}
                    className={cn(
                      "shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold",
                      pack.is_popular
                        ? "moshi-gradient text-white shadow-md"
                        : "bg-gray-100 text-moshi-text"
                    )}
                  >
                    {pack.price_fcfa.toLocaleString("fr-FR")} F
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-purple-100 bg-white p-4">
          <div className="mb-2 flex items-center gap-2 text-moshi-purple">
            <LockKeyhole size={17} />
            <p className="text-sm font-bold">Protection de ton portefeuille</p>
          </div>
          <p className="text-xs leading-5 text-gray-500">
            Les coins ne sont crédités qu’après confirmation d’un paiement
            valide. Les achats de test ne modifient jamais ton solde.
          </p>
        </div>

        <div className="mt-4 rounded-xl bg-gray-100 p-3 text-center text-xs text-gray-600">
          {paymentNotice}
        </div>
      </div>

      <p className="mt-8 flex items-center justify-center gap-1 px-8 text-center text-[10px] text-gray-400">
        <TrendingUp size={12} />
        Moshi protège le solde de tes coins.
      </p>
    </div>
  );
}

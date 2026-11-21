
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Coins,
  Loader2,
  Sparkles,
  LockKeyhole,
  RefreshCw,
  AlertCircle,
  Wallet,
  ShieldCheck,
} from "lucide-react";

interface CoinPack {
  id: string;
  coins: number;
  price_fcfa: number;
  bonus: number | null;
  is_popular: boolean | null;
}

export default function WalletPage() {
  const router = useRouter();

  const [supabase] = useState(() => createClient());

  const [balance, setBalance] = useState(0);
  const [packs, setPacks] = useState<CoinPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadWallet = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

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

      const [
        { data: wallet, error: walletError },
        { data: packData, error: packError },
      ] = await Promise.all([
        supabase
          .from("wallets")
          .select("coins_balance")
          .eq("user_id", user.id)
          .maybeSingle(),

        supabase
          .from("coin_packs")
          .select("id, coins, price_fcfa, bonus, is_popular")
          .order("price_fcfa", { ascending: true }),
      ]);

      if (walletError) throw walletError;
      if (packError) throw packError;

      setBalance(Number(wallet?.coins_balance ?? 0));

      setPacks(
        (packData ?? []).map((pack) => ({
          id: pack.id,
          coins: Number(pack.coins ?? 0),
          price_fcfa: Number(pack.price_fcfa ?? 0),
          bonus: Number(pack.bonus ?? 0),
          is_popular: Boolean(pack.is_popular),
        }))
      );
    } catch (err) {
      console.error("Erreur portefeuille Moshi :", err);

      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger ton portefeuille."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  function handleBuy() {
    setNotice(
      "La recharge sera disponible après l'intégration du paiement sécurisé. Aucun paiement ni crédit n'a été effectué."
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-moshi-bg">
        <Loader2 className="h-10 w-10 animate-spin text-moshi-purple" />
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-moshi-bg pb-10">
      {/* EN-TÊTE */}
      <header className="sticky top-0 z-20 flex items-center border-b border-gray-100 bg-white px-4 py-4 shadow-sm">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Retour"
          className="rounded-full p-2 transition hover:bg-gray-100"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>

        <h1 className="ml-2 text-lg font-bold text-gray-900">
          Mon portefeuille
        </h1>

        <button
          type="button"
          onClick={() => void loadWallet(true)}
          disabled={refreshing}
          aria-label="Actualiser le portefeuille"
          className="ml-auto rounded-full p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
        >
          <RefreshCw
            size={19}
            className={refreshing ? "animate-spin" : ""}
          />
        </button>
      </header>

      {/* SOLDE */}
      <div className="p-6">
        <section className="moshi-gradient relative overflow-hidden rounded-3xl p-6 text-white shadow-xl shadow-purple-200/50">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

          <div className="relative flex items-center gap-2">
            <Wallet className="h-5 w-5 text-white/80" />

            <p className="text-sm font-semibold text-white/80">
              Ton solde disponible
            </p>
          </div>

          <div className="relative mt-4 flex items-center gap-2">
            <Coins className="h-8 w-8 shrink-0 text-yellow-300" />

            <span className="text-4xl font-extrabold">
              {balance.toLocaleString("fr-FR")}
            </span>

            <span className="mt-2 text-sm font-semibold text-white/80">
              coins
            </span>
          </div>

          <p className="relative mt-3 text-xs text-white/70">
            Tes coins disponibles sur Moshi
          </p>

          <div className="relative mt-5 flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2">
            <ShieldCheck size={16} className="shrink-0 text-green-200" />

            <p className="text-xs text-white/90">
              Ton solde est protégé.
            </p>
          </div>
        </section>
      </div>

      {/* ERREUR */}
      {error && (
        <div className="mx-6 mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              Erreur de chargement
            </p>

            <p className="mt-1 break-words">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void loadWallet()}
              className="mt-2 font-bold underline"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      {/* PACKS DE COINS */}
      <section className="px-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-moshi-text">
              Recharger mes coins
            </h2>

            <p className="mt-1 text-xs text-gray-400">
              Choisis le pack qui te convient.
            </p>
          </div>

          <span className="flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-500">
            <LockKeyhole size={12} />
            Sécurisé
          </span>
        </div>

        {packs.length === 0 && !error ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center">
            <Coins className="mx-auto mb-3 h-9 w-9 text-gray-300" />

            <p className="font-semibold text-gray-700">
              Aucun pack disponible
            </p>

            <p className="mt-1 text-xs text-gray-400">
              Les packs de coins seront affichés ici.
            </p>

            <button
              type="button"
              onClick={() => void loadWallet(true)}
              className="mt-4 rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700"
            >
              Actualiser
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {packs.map((pack) => {
              const bonus = Number(pack.bonus ?? 0);
              const totalCoins = pack.coins + bonus;

              const pricePerCoin =
                totalCoins > 0
                  ? pack.price_fcfa / totalCoins
                  : 0;

              return (
                <article
                  key={pack.id}
                  className={`relative flex items-center justify-between gap-3 rounded-2xl border-2 bg-white p-4 shadow-sm ${
                    pack.is_popular
                      ? "border-moshi-purple"
                      : "border-transparent"
                  }`}
                >
                  {pack.is_popular && (
                    <span className="absolute -top-2.5 left-4 flex items-center gap-1 rounded-full bg-moshi-purple px-2 py-0.5 text-[9px] font-bold text-white">
                      <Sparkles size={10} />
                      MEILLEUR CHOIX
                    </span>
                  )}

                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                        pack.is_popular
                          ? "moshi-gradient text-white"
                          : "bg-yellow-50 text-yellow-600"
                      }`}
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

                      {bonus > 0 && (
                        <p className="text-[10px] font-bold text-green-500">
                          +{bonus.toLocaleString("fr-FR")} offerts
                        </p>
                      )}

                      <p className="mt-1 text-[10px] text-gray-400">
                        {pricePerCoin.toFixed(2)} FCFA / coin
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="mb-2 text-sm font-extrabold text-moshi-text">
                      {pack.price_fcfa.toLocaleString("fr-FR")} FCFA
                    </p>

                    <button
                      type="button"
                      onClick={handleBuy}
                      className={`rounded-xl px-4 py-2.5 text-xs font-bold transition active:scale-95 ${
                        pack.is_popular
                          ? "moshi-gradient text-white shadow-md"
                          : "bg-gray-100 text-moshi-text hover:bg-gray-200"
                      }`}
                    >
                      Acheter
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* MESSAGE DE RECHARGE */}
      {notice && (
        <div className="mx-6 mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />

            <div>
              <p className="text-sm font-bold text-orange-800">
                Recharge temporairement indisponible
              </p>

              <p className="mt-1 text-xs leading-relaxed text-orange-700">
                {notice}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* INFORMATIONS */}
      <section className="mx-6 mt-6 rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
            <ShieldCheck size={21} />
          </div>

          <div>
            <p className="text-sm font-bold text-gray-800">
              Portefeuille sécurisé
            </p>

            <p className="mt-1 text-xs leading-relaxed text-gray-400">
              Les opérations sur ton solde sont contrôlées côté serveur.
              Ne partage jamais tes informations de connexion.
            </p>
          </div>
        </div>
      </section>

      {/* PIED DE PAGE */}
      <footer className="px-6 pt-6 text-center">
        <p className="text-[10px] text-gray-400">
          Moshi Wallet · Tes coins, ton univers.
        </p>
      </footer>
    </main>
  );
}

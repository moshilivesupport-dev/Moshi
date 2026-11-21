
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
  Copy,
  Check,
  Clock,
  Bitcoin,
  CircleDollarSign,
  QrCode,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface CoinPack {
  id: string;
  coins: number;
  price_fcfa: number;
  bonus: number | null;
  is_popular: boolean | null;
}

interface CryptoCurrency {
  code: string;
  ticker: string;
  network: string;
  label: string;
}

interface CryptoPayment {
  cryptoTransactionId: string;
  merchantOrderId: string;
  paymentId: string;
  payCurrency: string;
  payAmount: string;
  payAddress: string;
  expiration: string | null;
  priceXof: number;
  coinsToCredit: number;
  paymentStatus: string;
}

interface PaymentStatus {
  id: string;
  status: string;
  provider_status: string | null;
  actually_paid: number | null;
  pay_amount: number | null;
  pay_currency: string;
  confirmed_at: string | null;
}

const TERMINAL_STATUSES = [
  "finished",
  "failed",
  "expired",
  "refunded",
];

const STATUS_LABELS: Record<string, string> = {
  waiting: "En attente de paiement",
  confirming: "Paiement détecté, confirmation en cours",
  confirmed: "Paiement confirmé par le réseau",
  sending: "Traitement du paiement",
  partially_paid: "Paiement partiel détecté",
  finished: "Paiement terminé",
  failed: "Paiement échoué",
  expired: "Demande de paiement expirée",
  refunded: "Paiement remboursé",
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("fr-FR").format(value);

export default function WalletPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [balance, setBalance] = useState(0);
  const [packs, setPacks] = useState<CoinPack[]>([]);
  const [currencies, setCurrencies] = useState<CryptoCurrency[]>([]);

  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [selectedPack, setSelectedPack] = useState<CoinPack | null>(null);

  const [activePayment, setActivePayment] =
    useState<CryptoPayment | null>(null);

  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [cryptoError, setCryptoError] = useState("");
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  const loadWallet = useCallback(
    async (isRefresh = false) => {
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
    },
    [supabase, router]
  );

  const loadCurrencies = useCallback(async () => {
    setLoadingCurrencies(true);
    setCryptoError("");

    try {
      const { data, error: functionError } =
        await supabase.functions.invoke("crypto-currencies", {
          body: {},
        });

      if (functionError) {
        throw new Error(
          data?.error ||
            functionError.message ||
            "Impossible de charger les cryptomonnaies."
        );
      }

      const list = Array.isArray(data?.currencies)
        ? (data.currencies as CryptoCurrency[])
        : [];

      if (list.length === 0) {
        throw new Error(
          "Aucune cryptomonnaie compatible n'est actuellement proposée."
        );
      }

      setCurrencies(list);

      const preferred =
        list.find((item) => item.code === "usdttrc20") ||
        list.find((item) => item.ticker === "USDT") ||
        list[0];

      setSelectedCurrency(preferred.code);
    } catch (err) {
      console.error("Erreur chargement crypto :", err);

      setCryptoError(
        err instanceof Error
          ? err.message
          : "Impossible de charger les moyens de paiement."
      );
    } finally {
      setLoadingCurrencies(false);
    }
  }, [supabase]);

  const refreshPaymentStatus = useCallback(async () => {
    if (!activePayment?.cryptoTransactionId) return;

    const { data, error: queryError } = await supabase
      .from("crypto_transactions")
      .select(
        "id,status,provider_status,actually_paid,pay_amount,pay_currency,confirmed_at"
      )
      .eq("id", activePayment.cryptoTransactionId)
      .maybeSingle();

    if (queryError) {
      console.error("Erreur statut paiement :", queryError);
      return;
    }

    if (!data) return;

    const status = data as PaymentStatus;
    setPaymentStatus(status);

    if (status.status === "finished") {
      await loadWallet(true);
    }
  }, [activePayment, supabase, loadWallet]);

  useEffect(() => {
    void loadWallet();
    void loadCurrencies();
  }, [loadWallet, loadCurrencies]);

  useEffect(() => {
    if (!activePayment?.cryptoTransactionId) return;
    if (paymentStatus && TERMINAL_STATUSES.includes(paymentStatus.status)) {
      return;
    }

    void refreshPaymentStatus();

    const interval = window.setInterval(() => {
      void refreshPaymentStatus();
    }, 8000);

    return () => window.clearInterval(interval);
  }, [activePayment, paymentStatus, refreshPaymentStatus]);

  const startCheckout = async (pack: CoinPack) => {
    if (!selectedCurrency) {
      setCryptoError("Sélectionne une cryptomonnaie avant de continuer.");
      return;
    }

    setSelectedPack(pack);
    setCreatingPayment(true);
    setCryptoError("");
    setNotice("");
    setActivePayment(null);
    setPaymentStatus(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/auth/login");
        return;
      }

      const { data, error: functionError } =
        await supabase.functions.invoke("crypto-checkout", {
          body: {
            coinPackId: pack.id,
            payCurrency: selectedCurrency,
          },
        });

      if (functionError) {
        throw new Error(
          data?.error ||
            functionError.message ||
            "Impossible de créer le paiement."
        );
      }

      if (
        !data?.cryptoTransactionId ||
        !data?.payAddress ||
        !data?.payAmount ||
        !data?.payCurrency
      ) {
        throw new Error(
          data?.error || "Réponse de paiement incomplète."
        );
      }

      setActivePayment({
        cryptoTransactionId: data.cryptoTransactionId,
        merchantOrderId: data.merchantOrderId,
        paymentId: data.paymentId,
        payCurrency: data.payCurrency,
        payAmount: String(data.payAmount),
        payAddress: data.payAddress,
        expiration: data.expiration ?? null,
        priceXof: Number(data.priceXof ?? pack.price_fcfa),
        coinsToCredit: Number(
          data.coinsToCredit ?? pack.coins + (pack.bonus ?? 0)
        ),
        paymentStatus: data.paymentStatus ?? "waiting",
      });

      setPaymentStatus({
        id: data.cryptoTransactionId,
        status: data.paymentStatus ?? "waiting",
        provider_status: data.paymentStatus ?? "waiting",
        actually_paid: null,
        pay_amount: Number(data.payAmount),
        pay_currency: data.payCurrency,
        confirmed_at: null,
      });

      setNotice(
        "Ta demande de paiement a été créée. Envoie exactement le montant indiqué à l'adresse affichée."
      );
    } catch (err) {
      console.error("Erreur création paiement crypto :", err);

      setCryptoError(
        err instanceof Error
          ? err.message
          : "Impossible de créer le paiement crypto."
      );
    } finally {
      setCreatingPayment(false);
    }
  };

  const copyAddress = async () => {
    if (!activePayment?.payAddress) return;

    try {
      await navigator.clipboard.writeText(activePayment.payAddress);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCryptoError(
        "Impossible de copier automatiquement. Sélectionne l'adresse manuellement."
      );
    }
  };

  const cancelPaymentView = () => {
    setActivePayment(null);
    setPaymentStatus(null);
    setSelectedPack(null);
    setNotice("");
    setCryptoError("");
  };

  const currentStatus =
    paymentStatus?.status ||
    activePayment?.paymentStatus ||
    "waiting";

  const isFinished = currentStatus === "finished";
  const isFailed = ["failed", "expired", "refunded"].includes(currentStatus);

  if (loading) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-moshi-bg">
        <Loader2 className="h-10 w-10 animate-spin text-moshi-purple" />
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-moshi-bg pb-10">
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
              {formatMoney(balance)}
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
              Ton solde est protégé par une confirmation côté serveur.
            </p>
          </div>
        </section>
      </div>

      {error && (
        <div className="mx-6 mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Erreur de chargement</p>
            <p className="mt-1 break-words">{error}</p>
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

      {!activePayment ? (
        <>
          <section className="px-6">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-moshi-text">
                Recharger mes coins
              </h2>
              <p className="mt-1 text-xs text-gray-400">
                Choisis un pack et règle avec ta cryptomonnaie.
              </p>
            </div>

            <div className="mb-5 rounded-2xl border border-gray-100 bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <CircleDollarSign className="h-5 w-5 text-moshi-purple" />
                <h3 className="text-sm font-bold text-gray-800">
                  Moyen de paiement
                </h3>
              </div>

              {loadingCurrencies ? (
                <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement des cryptomonnaies...
                </div>
              ) : currencies.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {currencies.map((currency) => {
                    const active =
                      selectedCurrency === currency.code;

                    return (
                      <button
                        key={currency.code}
                        type="button"
                        onClick={() => setSelectedCurrency(currency.code)}
                        className={`rounded-xl border p-3 text-left transition ${
                          active
                            ? "border-moshi-purple bg-purple-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-extrabold text-gray-800">
                            {currency.ticker}
                          </span>
                          {active && (
                            <CheckCircle2
                              size={17}
                              className="text-moshi-purple"
                            />
                          )}
                        </div>
                        <p className="mt-1 text-[10px] text-gray-500">
                          {currency.network}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  Les moyens crypto ne sont pas disponibles pour le moment.
                </p>
              )}

              {cryptoError && (
                <p className="mt-3 break-words text-xs text-red-600">
                  {cryptoError}
                </p>
              )}
            </div>

            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-moshi-text">
                  Choisis ton pack
                </h3>
                <p className="mt-1 text-xs text-gray-400">
                  Le montant crypto sera calculé au moment du paiement.
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-500">
                <LockKeyhole size={12} />
                Sécurisé
              </span>
            </div>

            {packs.length === 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center">
                <Coins className="mx-auto mb-3 h-9 w-9 text-gray-300" />
                <p className="font-semibold text-gray-700">
                  Aucun pack disponible
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
                    totalCoins > 0 ? pack.price_fcfa / totalCoins : 0;

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
                            {formatMoney(totalCoins)}
                            <span className="ml-1 text-xs font-semibold text-gray-400">
                              coins
                            </span>
                          </p>

                          {bonus > 0 && (
                            <p className="text-[10px] font-bold text-green-500">
                              +{formatMoney(bonus)} offerts
                            </p>
                          )}

                          <p className="mt-1 text-[10px] text-gray-400">
                            {pricePerCoin.toFixed(2)} FCFA / coin
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="mb-2 text-sm font-extrabold text-moshi-text">
                          {formatMoney(pack.price_fcfa)} FCFA
                        </p>

                        <button
                          type="button"
                          onClick={() => void startCheckout(pack)}
                          disabled={
                            creatingPayment ||
                            !selectedCurrency ||
                            loadingCurrencies
                          }
                          className={`rounded-xl px-4 py-2.5 text-xs font-bold transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                            pack.is_popular
                              ? "moshi-gradient text-white shadow-md"
                              : "bg-gray-100 text-moshi-text hover:bg-gray-200"
                          }`}
                        >
                          {creatingPayment && selectedPack?.id === pack.id ? (
                            <Loader2
                              size={15}
                              className="animate-spin"
                            />
                          ) : (
                            "Acheter"
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="mx-6 space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <QrCode className="h-6 w-6 text-moshi-purple" />
              <h2 className="text-lg font-bold text-gray-900">
                Effectuer le paiement
              </h2>
            </div>

            <div className="rounded-xl bg-purple-50 p-4">
              <p className="text-xs text-purple-700">
                Montant à envoyer
              </p>
              <p className="mt-1 break-all text-2xl font-extrabold text-purple-900">
                {activePayment.payAmount}{" "}
                {activePayment.payCurrency.toUpperCase()}
              </p>
              <p className="mt-2 text-xs text-purple-700">
                Réseau :{" "}
                {currencies.find(
                  (item) => item.code === activePayment.payCurrency
                )?.network || activePayment.payCurrency.toUpperCase()}
              </p>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-gray-600">
                Adresse de réception
              </p>

              <div className="break-all rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm font-medium text-gray-800">
                {activePayment.payAddress}
              </div>

              <button
                type="button"
                onClick={() => void copyAddress()}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
              >
                {copied ? <Check size={17} /> : <Copy size={17} />}
                {copied ? "Adresse copiée" : "Copier l'adresse"}
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50 p-3">
              <p className="text-xs leading-relaxed text-orange-800">
                Envoie uniquement cette cryptomonnaie sur le réseau indiqué.
                Un mauvais réseau ou une adresse incorrecte peut entraîner
                une perte définitive des fonds.
              </p>
            </div>

            {activePayment.expiration && (
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <Clock size={15} />
                Expiration estimée :{" "}
                {new Date(activePayment.expiration).toLocaleString("fr-FR")}
              </div>
            )}

            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500">
                Référence Moshi
              </p>
              <p className="mt-1 break-all text-xs font-semibold text-gray-800">
                {activePayment.merchantOrderId}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className="flex items-center gap-3">
              {isFinished ? (
                <CheckCircle2 className="h-7 w-7 text-green-500" />
              ) : isFailed ? (
                <XCircle className="h-7 w-7 text-red-500" />
              ) : (
                <Loader2 className="h-7 w-7 animate-spin text-moshi-purple" />
              )}

              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800">
                  Suivi du paiement
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {STATUS_LABELS[currentStatus] || currentStatus}
                </p>
              </div>
            </div>

            {paymentStatus?.actually_paid != null && (
              <p className="mt-3 text-xs text-gray-500">
                Montant détecté : {paymentStatus.actually_paid}{" "}
                {activePayment.payCurrency.toUpperCase()}
              </p>
            )}

            {isFinished && (
              <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3">
                <p className="text-sm font-bold text-green-800">
                  Paiement confirmé !
                </p>
                <p className="mt-1 text-xs text-green-700">
                  {formatMoney(activePayment.coinsToCredit)} coins ont été
                  attribués à ton portefeuille.
                </p>
              </div>
            )}

            {isFailed && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-xs text-red-700">
                  Cette demande n'est plus active. Vérifie ton historique
                  avant de créer un nouveau paiement.
                </p>
              </div>
            )}

            {!isFinished && !isFailed && (
              <p className="mt-3 text-xs leading-relaxed text-gray-500">
                Moshi vérifie automatiquement la confirmation auprès du
                prestataire. Ne partage pas de capture d'écran comme preuve
                de paiement et ne renvoie pas un second paiement pour cette
                même demande.
              </p>
            )}

            <button
              type="button"
              onClick={() => void refreshPaymentStatus()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-200"
            >
              <RefreshCw size={16} />
              Vérifier maintenant
            </button>
          </div>

          <button
            type="button"
            onClick={cancelPaymentView}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-600"
          >
            Retour aux packs
          </button>
        </section>
      )}

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
              Les coins sont crédités uniquement après confirmation du
              paiement par le serveur et le prestataire.
            </p>
          </div>
        </div>
      </section>

      <footer className="px-6 pt-6 text-center">
        <p className="text-[10px] text-gray-400">
          Moshi Wallet · Tes coins, ton univers.
        </p>
      </footer>
    </main>
  );
}

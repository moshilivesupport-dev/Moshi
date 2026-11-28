"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  XCircle,
  Loader2,
  ShoppingBag,
  RefreshCw,
} from "lucide-react";

import { useMoshiPreferences } from "@/components/providers/MoshiPreferencesProvider";

type PaymentStatus =
  | "pending"
  | "accepted"
  | "refused"
  | "cancelled"
  | "expired";

type PaymentResponse = {
  merchant_transaction_id: string;
  status: PaymentStatus;
  amount_xof: number;
  currency: string;
  display_currency: string;
  display_total: number | null;
  created_at: string;
};

export default function CheckoutResultPage() {
  const searchParams = useSearchParams();

  const reference =
    searchParams.get("reference") || "";

  const outcome =
    searchParams.get("outcome") || "";

  const { t, formatXof } = useMoshiPreferences();

  const [payment, setPayment] =
    useState<PaymentResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    if (!reference) {
      setError(t("Référence de paiement manquante."));
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/checkout/status?reference=${encodeURIComponent(
          reference
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.payment) {
        throw new Error(
          result.error || t("Impossible de vérifier le paiement.")
        );
      }

      setPayment(result.payment);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("Impossible de vérifier le paiement.")
      );
    } finally {
      setLoading(false);
    }
  }, [reference, t]);

  useEffect(() => {
    void loadStatus();

    if (!reference) return;

    const interval = window.setInterval(() => {
      void loadStatus();
    }, 4000);

    return () => window.clearInterval(interval);
  }, [loadStatus, reference]);

  const status = payment?.status || "pending";

  const isSuccess = status === "accepted";

  const isFailure =
    status === "refused" ||
    status === "cancelled" ||
    status === "expired";

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-moshi-bg px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-purple-100 bg-white p-7 text-center shadow-sm">
        {loading && !payment ? (
          <>
            <Loader2 className="mx-auto h-14 w-14 animate-spin text-moshi-purple" />

            <h1 className="mt-5 text-xl font-extrabold text-gray-900">
              {t("Vérification du paiement...")}
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              {t("Nous vérifions la confirmation auprès de CinetPay.")}
            </p>
          </>
        ) : isSuccess ? (
          <>
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />

            <h1 className="mt-5 text-2xl font-extrabold text-gray-900">
              {t("Paiement confirmé !")}
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              {t("Ta commande a été enregistrée avec succès.")}
            </p>

            {payment && (
              <div className="mt-5 rounded-2xl bg-green-50 p-4">
                <p className="text-xs font-semibold text-green-800">
                  {t("Montant encaissé en XOF")}
                </p>

                <p className="mt-1 text-xl font-extrabold text-green-900">
                  {formatXof(Number(payment.amount_xof))}
                </p>
              </div>
            )}
          </>
        ) : isFailure ? (
          <>
            <XCircle className="mx-auto h-16 w-16 text-red-500" />

            <h1 className="mt-5 text-2xl font-extrabold text-gray-900">
              {t("Paiement non confirmé")}
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              {t("Le paiement a échoué ou a été annulé. Tu peux réessayer depuis ton panier.")}
            </p>
          </>
        ) : (
          <>
            <Clock3 className="mx-auto h-16 w-16 text-amber-500" />

            <h1 className="mt-5 text-xl font-extrabold text-gray-900">
              {t("Paiement en cours de vérification")}
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              {t("La confirmation CinetPay n'est pas encore arrivée. Garde cette page ouverte quelques instants.")}
            </p>

            <button
              type="button"
              onClick={() => {
                setLoading(true);
                void loadStatus();
              }}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-purple-200 px-4 py-2 text-sm font-bold text-moshi-purple"
            >
              <RefreshCw className="h-4 w-4" />
              {t("Vérifier à nouveau")}
            </button>
          </>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">
            {error}
          </p>
        )}

        {outcome === "failed" && !payment && (
          <p className="mt-3 text-xs text-gray-400">
            {t("Le retour du navigateur ne remplace pas la confirmation du serveur.")}
          </p>
        )}

        <div className="mt-7 flex flex-col gap-3">
          {isSuccess ? (
            <Link
              href="/shop"
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl moshi-gradient px-5 py-3 text-sm font-bold text-white"
            >
              <ShoppingBag className="h-4 w-4" />
              {t("Continuer mes achats")}
            </Link>
          ) : (
            <Link
              href="/cart"
              className="flex min-h-12 items-center justify-center rounded-xl moshi-gradient px-5 py-3 text-sm font-bold text-white"
            >
              {t("Retourner au panier")}
            </Link>
          )}

          <Link
            href="/"
            className="py-2 text-sm font-semibold text-gray-500"
          >
            {t("Retour à l'accueil")}
          </Link>
        </div>

        {payment?.merchant_transaction_id && (
          <p className="mt-6 break-all text-[10px] text-gray-400">
            {t("Référence")}: {payment.merchant_transaction_id}
          </p>
        )}
      </section>
    </main>
  );
}
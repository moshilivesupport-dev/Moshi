
"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  CreditCard,
  Coins,
  RefreshCw,
  Search,
  Clock3,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  UserRound,
  CalendarDays,
  ShieldCheck,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Bitcoin,
  Smartphone,
  ExternalLink,
} from "lucide-react";

type PaymentStatus = "pending" | "success" | "failed" | "refunded";

type PaymentUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  avatar_url: string | null;
} | null;

type Payment = {
  id: string;
  provider: "cinetpay" | "crypto";
  providerLabel: string;
  userId: string;
  user: PaymentUser;
  reference: string | null;
  providerReference: string | null;
  amount: number;
  currency: string;
  fees: number | null;
  paymentMethod: string | null;
  status: PaymentStatus;
  providerStatus: string | null;
  coins: number | null;
  cryptoAmount?: number | null;
  cryptoPaid?: number | null;
  cryptoCurrency?: string | null;
  usdAmount?: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  confirmedAt: string | null;
  expiresAt: string | null;
  orderId: string | null;
};

type ApiResponse = {
  success: boolean;
  payments: Payment[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  providerLimits?: {
    maxRowsPerProvider: number;
    truncated: boolean;
  };
  totals?: {
    cinetpay: number;
    crypto: number;
  };
};
{
  title: "Paiements",
  href: "/admin/payments",
  // conserve les autres propriétés du module
}
const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "En attente",
  success: "Réussi",
  failed: "Échoué",
  refunded: "Remboursé",
};

const STATUS_STYLES: Record<PaymentStatus, string> = {
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  failed: "border-red-500/20 bg-red-500/10 text-red-300",
  refunded: "border-blue-500/20 bg-blue-500/10 text-blue-300",
};

function formatMoney(amount: number, currency: string) {
  return (
    new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 2,
    }).format(Number(amount || 0)) +
    " " +
    currency
  );
}

function formatDate(value: string | null) {
  if (!value) return "Non renseignée";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date invalide";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function StatCard({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111722] p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">{label}</span>
        <div className="rounded-xl bg-purple-500/10 p-3 text-purple-300">
          {icon}
        </div>
      </div>
      <p className="mt-4 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: PaymentStatus }) {
  if (status === "success") return <CheckCircle2 size={14} />;
  if (status === "failed") return <XCircle size={14} />;
  if (status === "refunded") return <RotateCcw size={14} />;
  return <Clock3 size={14} />;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [providerTotals, setProviderTotals] = useState({
    cinetpay: 0,
    crypto: 0,
  });
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [selected, setSelected] = useState<Payment | null>(null);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        provider,
        status,
      });

      if (search.trim()) params.set("q", search.trim());

      const response = await fetch(
        `/api/admin/payments?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Impossible de charger les paiements.");
      }

      const data = result as ApiResponse;

      setPayments(data.payments ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setProviderTotals(data.totals ?? { cinetpay: 0, crypto: 0 });
      setTruncated(Boolean(data.providerLimits?.truncated));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }, [page, provider, status, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPayments();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [loadPayments]);

  const changeProvider = (value: string) => {
    setProvider(value);
    setPage(1);
    setSelected(null);
  };

  const changeStatus = (value: string) => {
    setStatus(value);
    setPage(1);
    setSelected(null);
  };

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    setSelected(null);
  };

  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(value);
      window.setTimeout(() => setCopiedId(""), 1800);
    } catch {
      setError("Impossible de copier cette référence.");
    }
  };

  const successful = payments.filter(
    (item) => item.status === "success"
  ).length;

  const pending = payments.filter(
    (item) => item.status === "pending"
  ).length;

  const failed = payments.filter(
    (item) => item.status === "failed"
  ).length;

  return (
    <main className="min-h-screen bg-[#080b12] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm text-purple-300">
              <ShieldCheck size={18} />
              Administration Moshi
            </div>

            <h1 className="text-2xl font-bold sm:text-3xl">
              Centre des paiements
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Suivi centralisé des paiements CinetPay et crypto.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadPayments()}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Actualiser
          </button>
        </header>

        <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Paiements trouvés"
            value={String(total)}
            description="Selon les filtres actifs"
            icon={<CreditCard size={21} />}
          />
          <StatCard
            label="CinetPay"
            value={String(providerTotals.cinetpay)}
            description="Transactions enregistrées"
            icon={<Smartphone size={21} />}
          />
          <StatCard
            label="Crypto"
            value={String(providerTotals.crypto)}
            description="Transactions NOWPayments"
            icon={<Bitcoin size={21} />}
          />
          <StatCard
            label="Réussis sur cette page"
            value={String(successful)}
            description={`${pending} en attente · ${failed} échoués`}
            icon={<CheckCircle2 size={21} />}
          />
        </section>

        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
          <AlertTriangle size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Contrôle des paiements</p>
            <p className="mt-1 text-amber-200/70">
              Les statuts affichés proviennent des transactions enregistrées
              après traitement serveur. Cette page ne valide pas manuellement
              les paiements et ne crédite pas les coins.
            </p>
          </div>
        </div>

        {truncated && (
          <div className="mb-5 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200">
            L’historique est volumineux : cette vue charge au maximum les
            1 000 transactions les plus récentes par prestataire. Une
            pagination côté base de données sera nécessaire lorsque ce seuil
            sera atteint.
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="mb-6 rounded-2xl border border-white/10 bg-[#111722] p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_190px_190px]">
            <div className="relative">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => changeSearch(event.target.value)}
                placeholder="Utilisateur, e-mail ou référence..."
                className="h-12 w-full rounded-xl border border-white/10 bg-[#080b12] pl-11 pr-4 text-sm outline-none focus:border-purple-400"
              />
            </div>

            <select
              value={provider}
              onChange={(event) => changeProvider(event.target.value)}
              className="h-12 rounded-xl border border-white/10 bg-[#080b12] px-4 text-sm outline-none focus:border-purple-400"
            >
              <option value="all">Tous les prestataires</option>
              <option value="cinetpay">CinetPay</option>
              <option value="crypto">Crypto / NOWPayments</option>
            </select>

            <select
              value={status}
              onChange={(event) => changeStatus(event.target.value)}
              className="h-12 rounded-xl border border-white/10 bg-[#080b12] px-4 text-sm outline-none focus:border-purple-400"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="success">Réussis</option>
              <option value="failed">Échoués</option>
              <option value="refunded">Remboursés</option>
            </select>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#111722]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
            <div>
              <h2 className="font-bold">Historique des transactions</h2>
              <p className="mt-1 text-xs text-gray-500">
                {total} transaction(s) correspondant aux filtres
              </p>
            </div>

            <span className="text-xs text-gray-500">
              Page {page} / {totalPages}
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-52 items-center justify-center gap-3 text-sm text-gray-400">
              <Loader2 size={20} className="animate-spin" />
              Chargement des paiements...
            </div>
          ) : payments.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center px-5 text-center">
              <CreditCard size={34} className="mb-3 text-gray-600" />
              <p className="font-semibold">Aucun paiement trouvé</p>
              <p className="mt-1 text-sm text-gray-500">
                Modifie les filtres ou actualise la liste.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {payments.map((item) => {
                const userName =
                  item.user?.full_name ||
                  item.user?.username ||
                  "Utilisateur inconnu";

                return (
                  <article
                    key={`${item.provider}-${item.id}`}
                    className="p-5 transition hover:bg-white/[0.02]"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          {item.user?.avatar_url ? (
                            <img
                              src={item.user.avatar_url}
                              alt=""
                              className="h-11 w-11 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-500/10 text-purple-300">
                              <UserRound size={21} />
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="truncate font-semibold">
                              {userName}
                            </p>
                            <p className="truncate text-xs text-gray-500">
                              {item.user?.email || "E-mail non renseigné"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-300">
                            {item.providerLabel}
                          </span>
                          <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-400">
                            {item.paymentMethod || "Méthode inconnue"}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-3 text-xs text-gray-400 sm:grid-cols-2">
                          <div className="flex items-center gap-1.5">
                            <CalendarDays size={14} />
                            Créé : {formatDate(item.createdAt)}
                          </div>
                          <div>
                            Mise à jour : {formatDate(item.updatedAt)}
                          </div>
                          {item.confirmedAt && (
                            <div>
                              Confirmation : {formatDate(item.confirmedAt)}
                            </div>
                          )}
                          {item.expiresAt && (
                            <div>
                              Expiration : {formatDate(item.expiresAt)}
                            </div>
                          )}
                          {item.fees !== null && (
                            <div>
                              Frais enregistrés :{" "}
                              {formatMoney(item.fees, item.currency)}
                            </div>
                          )}
                          {item.coins !== null && (
                            <div className="flex items-center gap-1.5 text-amber-300">
                              <Coins size={14} />
                              {item.coins.toLocaleString("fr-FR")} coins prévus
                            </div>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] text-gray-500">
                            Référence :
                          </span>
                          <code className="max-w-64 truncate text-[11px] text-gray-400">
                            {item.reference || item.id}
                          </code>
                          <button
                            type="button"
                            onClick={() =>
                              void copyValue(item.reference || item.id)
                            }
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-white/10 hover:text-white"
                            title="Copier la référence"
                          >
                            {copiedId === (item.reference || item.id) ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>

                        {item.providerReference && (
                          <p className="mt-2 text-xs text-gray-500">
                            Référence prestataire : {item.providerReference}
                          </p>
                        )}

                        {item.providerStatus && (
                          <p className="mt-2 text-xs text-gray-500">
                            Statut prestataire : {item.providerStatus}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-start gap-3 lg:min-w-52 lg:items-end">
                        <p className="text-xl font-bold tabular-nums">
                          {formatMoney(item.amount, item.currency)}
                        </p>

                        {item.provider === "crypto" && item.cryptoAmount !== null && (
                          <p className="text-xs text-gray-400">
                            Montant crypto attendu :{" "}
                            {item.cryptoAmount ?? "—"}{" "}
                            {item.cryptoCurrency}
                          </p>
                        )}

                        {item.provider === "crypto" && item.cryptoPaid !== null && (
                          <p className="text-xs text-gray-400">
                            Montant reçu : {item.cryptoPaid ?? "—"}{" "}
                            {item.cryptoCurrency}
                          </p>
                        )}

                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${STATUS_STYLES[item.status]}`}
                        >
                          <StatusIcon status={item.status} />
                          {STATUS_LABELS[item.status]}
                        </span>

                        <button
                          type="button"
                          onClick={() => setSelected(item)}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5"
                        >
                          Détails
                          <ExternalLink size={13} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-white/10 p-4">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page <= 1 || loading}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm disabled:opacity-30"
            >
              <ChevronLeft size={16} />
              Précédent
            </button>

            <span className="text-xs text-gray-500">
              {page} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
              disabled={page >= totalPages || loading}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm disabled:opacity-30"
            >
              Suivant
              <ChevronRight size={16} />
            </button>
          </div>
        </section>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-detail-title"
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#111722] p-5 shadow-2xl sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-purple-300">
                  {selected.providerLabel}
                </p>
                <h2
                  id="payment-detail-title"
                  className="mt-1 text-xl font-bold"
                >
                  Détails du paiement
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-300 hover:bg-white/5"
              >
                Fermer
              </button>
            </div>

            <div className="mb-5 rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs text-gray-500">Montant enregistré</p>
              <p className="mt-1 text-2xl font-bold">
                {formatMoney(selected.amount, selected.currency)}
              </p>
              <span
                className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${STATUS_STYLES[selected.status]}`}
              >
                <StatusIcon status={selected.status} />
                {STATUS_LABELS[selected.status]}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Utilisateur" value={selected.user?.full_name || selected.user?.username || "Inconnu"} />
              <Detail label="E-mail" value={selected.user?.email || "Non renseigné"} />
              <Detail label="Téléphone" value={selected.user?.phone || "Non renseigné"} />
              <Detail label="Pays" value={selected.user?.country || "Non renseigné"} />
              <Detail label="Méthode" value={selected.paymentMethod || "Non renseignée"} />
              <Detail label="Statut prestataire" value={selected.providerStatus || "Non renseigné"} />
              <Detail label="Référence Moshi" value={selected.reference || selected.id} />
              <Detail label="Référence prestataire" value={selected.providerReference || "Non renseignée"} />
              <Detail label="Création" value={formatDate(selected.createdAt)} />
              <Detail label="Dernière mise à jour" value={formatDate(selected.updatedAt)} />
              <Detail label="Confirmation" value={formatDate(selected.confirmedAt)} />
              <Detail label="Expiration" value={formatDate(selected.expiresAt)} />
              {selected.fees !== null && (
                <Detail label="Frais" value={formatMoney(selected.fees, selected.currency)} />
              )}
              {selected.coins !== null && (
                <Detail label="Coins prévus" value={String(selected.coins)} />
              )}
              {selected.orderId && (
                <Detail label="Commande liée" value={selected.orderId} />
              )}
              {selected.usdAmount !== undefined && (
                <Detail label="Équivalent USD" value={formatMoney(selected.usdAmount, "USD")} />
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => void copyValue(selected.reference || selected.id)}
                className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold hover:bg-white/5"
              >
                <Copy size={15} />
                Copier la référence
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 break-all text-sm text-gray-200">{value}</p>
    </div>
  );
}

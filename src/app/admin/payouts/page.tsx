
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Wallet,
  RefreshCw,
  Search,
  Clock3,
  CheckCircle2,
  XCircle,
  Loader2,
  UserRound,
  CalendarDays,
  ShieldCheck,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Copy,
} from "lucide-react";

type Seller = {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  country: string | null;
};

type Withdrawal = {
  id: string;
  seller_id: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "paid" | "rejected";
  notes: string | null;
  admin_note: string | null;
  cinetpay_payout_id: string | null;
  created_at: string | null;
  processed_at: string | null;
  processed_by: string | null;
  seller: Seller | null;
};

type ApiResponse = {
  success: boolean;
  withdrawals: Withdrawal[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  processing: "En traitement",
  paid: "Payé",
  rejected: "Refusé",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  processing: "border-blue-500/20 bg-blue-500/10 text-blue-300",
  paid: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  rejected: "border-red-500/20 bg-red-500/10 text-red-300",
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(Number(amount || 0)) + " " + currency;
}

function formatDate(value: string | null) {
  if (!value) return "Non renseignée";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function StatCard({
  label,
  value,
  icon,
  description,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  description: string;
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

export default function AdminPayoutsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");

  const loadWithdrawals = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
      });

      if (status !== "all") {
        params.set("status", status);
      }

      if (search.trim()) {
        params.set("q", search.trim());
      }

      const response = await fetch(
        `/api/admin/withdrawals?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Impossible de charger les retraits."
        );
      }

      const data = result as ApiResponse;

      setWithdrawals(data.withdrawals ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadWithdrawals();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [loadWithdrawals]);

  const changeStatus = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(""), 1800);
    } catch {
      setError("Impossible de copier cet identifiant.");
    }
  };

  const pending = withdrawals.filter(
    (item) => item.status === "pending"
  ).length;

  const processing = withdrawals.filter(
    (item) => item.status === "processing"
  ).length;

  const paid = withdrawals.filter(
    (item) => item.status === "paid"
  ).length;

  const rejected = withdrawals.filter(
    (item) => item.status === "rejected"
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
              Retraits des vendeurs
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Suivi des demandes de retrait et contrôle des versements.
            </p>
          </div>

          <button
            type="button"
            onClick={loadWithdrawals}
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
            label="Demandes trouvées"
            value={String(total)}
            description="Résultats correspondant aux filtres"
            icon={<Wallet size={21} />}
          />

          <StatCard
            label="En attente"
            value={String(pending)}
            description="Sur cette page"
            icon={<Clock3 size={21} />}
          />

          <StatCard
            label="En traitement"
            value={String(processing)}
            description="Sur cette page"
            icon={<Loader2 size={21} />}
          />

          <StatCard
            label="Terminés"
            value={String(paid + rejected)}
            description="Payés ou refusés sur cette page"
            icon={<CheckCircle2 size={21} />}
          />
        </section>

        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
          <AlertTriangle size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Versements sécurisés</p>
            <p className="mt-1 text-amber-200/70">
              Cette interface permet actuellement de consulter les
              demandes. Un retrait ne peut pas être déclaré payé sans
              confirmation réelle du prestataire de paiement.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="mb-6 rounded-2xl border border-white/10 bg-[#111722] p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => changeSearch(event.target.value)}
                placeholder="Rechercher un vendeur, e-mail ou téléphone..."
                className="h-12 w-full rounded-xl border border-white/10 bg-[#080b12] pl-11 pr-4 text-sm outline-none focus:border-purple-400"
              />
            </div>

            <select
              value={status}
              onChange={(event) => changeStatus(event.target.value)}
              className="h-12 rounded-xl border border-white/10 bg-[#080b12] px-4 text-sm outline-none focus:border-purple-400"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="processing">En traitement</option>
              <option value="paid">Payés</option>
              <option value="rejected">Refusés</option>
            </select>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#111722]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
            <div>
              <h2 className="font-bold">Demandes de retrait</h2>
              <p className="mt-1 text-xs text-gray-500">
                {total} demande(s) au total
              </p>
            </div>

            <span className="text-xs text-gray-500">
              Page {page} / {totalPages}
            </span>
          </div>

          {loading ? (
            <div className="flex min-h-52 items-center justify-center gap-3 text-sm text-gray-400">
              <Loader2 size={20} className="animate-spin" />
              Chargement des demandes...
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center px-5 text-center">
              <Wallet size={34} className="mb-3 text-gray-600" />
              <p className="font-semibold">Aucune demande trouvée</p>
              <p className="mt-1 text-sm text-gray-500">
                Modifie les filtres ou actualise la liste.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {withdrawals.map((item) => {
                const sellerName =
                  item.seller?.full_name ||
                  item.seller?.username ||
                  "Vendeur inconnu";

                return (
                  <article
                    key={item.id}
                    className="p-5 transition hover:bg-white/[0.02]"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          {item.seller?.avatar_url ? (
                            <img
                              src={item.seller.avatar_url}
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
                              {sellerName}
                            </p>
                            <p className="truncate text-xs text-gray-500">
                              {item.seller?.email || "E-mail non renseigné"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 text-xs text-gray-400 sm:grid-cols-2">
                          <div>
                            <span className="text-gray-500">Téléphone :</span>{" "}
                            {item.seller?.phone || "Non renseigné"}
                          </div>

                          <div>
                            <span className="text-gray-500">Pays :</span>{" "}
                            {item.seller?.country || "Non renseigné"}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <CalendarDays size={14} />
                            Demande : {formatDate(item.created_at)}
                          </div>

                          <div>
                            Traitement : {formatDate(item.processed_at)}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] text-gray-500">
                            Référence :
                          </span>

                          <code className="max-w-52 truncate text-[11px] text-gray-400">
                            {item.id}
                          </code>

                          <button
                            type="button"
                            onClick={() => copyId(item.id)}
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-white/10 hover:text-white"
                            title="Copier la référence"
                          >
                            {copiedId === item.id ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>

                        {item.notes && (
                          <p className="mt-3 text-xs text-gray-400">
                            <span className="text-gray-500">Note vendeur :</span>{" "}
                            {item.notes}
                          </p>
                        )}

                        {item.admin_note && (
                          <p className="mt-2 text-xs text-purple-300">
                            <span className="text-gray-500">Note admin :</span>{" "}
                            {item.admin_note}
                          </p>
                        )}

                        {item.cinetpay_payout_id && (
                          <p className="mt-2 text-xs text-gray-500">
                            Référence prestataire :{" "}
                            {item.cinetpay_payout_id}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-start gap-3 lg:min-w-48 lg:items-end">
                        <p className="text-xl font-bold tabular-nums">
                          {formatMoney(item.amount, item.currency)}
                        </p>

                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                            STATUS_STYLES[item.status] || ""
                          }`}
                        >
                          {item.status === "pending" && <Clock3 size={14} />}
                          {item.status === "processing" && <Loader2 size={14} />}
                          {item.status === "paid" && <CheckCircle2 size={14} />}
                          {item.status === "rejected" && <XCircle size={14} />}
                          {STATUS_LABELS[item.status] || item.status}
                        </span>

                        <p className="text-[11px] text-gray-500">
                          ID vendeur : {item.seller_id.slice(0, 8)}...
                        </p>
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
    </main>
  );
}

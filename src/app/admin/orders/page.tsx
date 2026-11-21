
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Truck,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  XCircle,
  ExternalLink,
} from "lucide-react";

type Person = {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
};

type Product = {
  id: string;
  title: string;
  image_url: string | null;
  price: number;
  currency: string;
};

type Order = {
  id: string;
  buyer_id: string | null;
  seller_id: string | null;
  product_id: string | null;
  quantity: number | null;
  unit_price: number;
  total_amount: number;
  currency: string | null;
  status: string | null;
  escrow_status: string | null;
  tracking_code: string | null;
  shipping_address: Record<string, unknown> | null;
  created_at: string | null;
  buyer: Person | null;
  seller: Person | null;
  product: Product | null;
};

const STATUS: Record<string, string> = {
  pending: "En attente",
  paid: "Payée",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  disputed: "En litige",
  refunded: "Remboursée",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-300",
  paid: "bg-blue-500/10 text-blue-300",
  shipped: "bg-purple-500/10 text-purple-300",
  delivered: "bg-emerald-500/10 text-emerald-300",
  cancelled: "bg-gray-500/10 text-gray-300",
  disputed: "bg-red-500/10 text-red-300",
  refunded: "bg-orange-500/10 text-orange-300",
};

const FILTERS = [
  ["all", "Toutes"],
  ["pending", "En attente"],
  ["paid", "Payées"],
  ["shipped", "Expédiées"],
  ["delivered", "Livrées"],
  ["disputed", "En litige"],
  ["cancelled", "Annulées"],
  ["refunded", "Remboursées"],
];

function money(value: number, currency: string | null) {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0)) + " " + (currency || "XOF");
}

function date(value: string | null) {
  if (!value) return "Date inconnue";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function personName(person: Person | null) {
  if (!person) return "Compte indisponible";

  return (
    person.full_name ||
    person.username ||
    person.email ||
    "Utilisateur"
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
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
        `/api/admin/orders?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Impossible de charger les commandes."
        );
      }

      setOrders(result.orders ?? []);
      setTotal(result.total ?? 0);
      setTotalPages(result.totalPages ?? 1);
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
    void loadOrders();
  }, [loadOrders]);

  function changeStatus(value: string) {
    setStatus(value);
    setPage(1);
  }

  return (
    <main className="min-h-screen bg-[#080b12] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-purple-500/10 p-3 text-purple-300">
              <Package size={25} />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-purple-300">
                MOSHI ADMIN
              </p>
              <h1 className="text-2xl font-bold">
                Gestion des commandes
              </h1>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => void loadOrders()}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Actualiser
            </button>

            <Link
              href="/admin"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
            >
              Administration
            </Link>
          </div>
        </header>

        <section className="mt-7 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#111722] p-5">
            <p className="text-sm text-gray-400">
              Commandes correspondant au filtre
            </p>
            <p className="mt-3 text-3xl font-bold">{total}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111722] p-5">
            <p className="text-sm text-gray-400">
              Page actuelle
            </p>
            <p className="mt-3 text-3xl font-bold">
              {page} / {totalPages}
            </p>
          </div>
        </section>

        <section className="mt-7 rounded-2xl border border-white/10 bg-[#111722] p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Rechercher un numéro de commande, un acheteur ou un vendeur..."
                className="w-full rounded-xl border border-white/10 bg-[#080b12] py-3 pl-10 pr-4 text-sm outline-none focus:border-purple-400"
              />
            </div>

            <select
              value={status}
              onChange={(event) => changeStatus(event.target.value)}
              className="rounded-xl border border-white/10 bg-[#080b12] px-4 py-3 text-sm outline-none"
            >
              {FILTERS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {error && (
          <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="mt-6 space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-[#111722] p-12 text-center text-gray-400">
              <RefreshCw className="mx-auto mb-3 animate-spin" />
              Chargement des commandes...
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#111722] p-12 text-center">
              <Package className="mx-auto mb-3 text-gray-500" size={32} />
              <p className="font-semibold">Aucune commande trouvée</p>
              <p className="mt-1 text-sm text-gray-500">
                Modifie les filtres ou la recherche.
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const currentStatus = order.status || "pending";

              return (
                <article
                  key={order.id}
                  className="rounded-2xl border border-white/10 bg-[#111722] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-500">
                        Commande #{order.id.slice(0, 8)}
                      </p>
                      <h2 className="mt-1 text-lg font-bold">
                        {order.product?.title || "Produit indisponible"}
                      </h2>
                      <p className="mt-1 text-xs text-gray-500">
                        Créée le {date(order.created_at)}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        STATUS_STYLE[currentStatus] ||
                        "bg-white/10 text-gray-300"
                      }`}
                    >
                      {STATUS[currentStatus] || currentStatus}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs text-gray-500">Acheteur</p>
                      <p className="mt-1 text-sm font-semibold">
                        {personName(order.buyer)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Vendeur</p>
                      <p className="mt-1 text-sm font-semibold">
                        {personName(order.seller)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Quantité</p>
                      <p className="mt-1 text-sm font-semibold">
                        {order.quantity ?? 0}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">Montant</p>
                      <p className="mt-1 text-sm font-bold text-emerald-300">
                        {money(order.total_amount, order.currency)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock3 size={14} />
                        Séquestre : {order.escrow_status || "Non renseigné"}
                      </span>

                      {order.tracking_code && (
                        <span className="flex items-center gap-1">
                          <Truck size={14} />
                          Suivi : {order.tracking_code}
                        </span>
                      )}

                      {currentStatus === "disputed" && (
                        <span className="flex items-center gap-1 text-red-300">
                          <AlertTriangle size={14} />
                          Réclamation à examiner
                        </span>
                      )}

                      {currentStatus === "delivered" && (
                        <span className="flex items-center gap-1 text-emerald-300">
                          <CheckCircle2 size={14} />
                          Livraison déclarée
                        </span>
                      )}

                      {currentStatus === "cancelled" && (
                        <span className="flex items-center gap-1">
                          <XCircle size={14} />
                          Commande annulée
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        navigator.clipboard.writeText(order.id)
                      }
                      className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/5"
                    >
                      Copier l'identifiant
                      <ExternalLink size={13} />
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <footer className="mt-7 flex items-center justify-between border-t border-white/10 pt-5">
          <p className="text-xs text-gray-500">
            {total} commande(s) · {orders.length} affichée(s)
          </p>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded-lg border border-white/10 p-2 disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>

            <span className="text-sm text-gray-400">
              {page} / {totalPages}
            </span>

            <button
              disabled={page >= totalPages || loading}
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
              className="rounded-lg border border-white/10 p-2 disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}

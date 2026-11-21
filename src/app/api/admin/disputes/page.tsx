
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Clock3,
  CheckCircle2,
  XCircle,
  Package,
  CreditCard,
  Truck,
  MessageSquare,
  UserRound,
  Copy,
} from "lucide-react";

type Person = {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  country: string | null;
};

type Order = {
  id: string;
  total_amount: number;
  currency: string | null;
  status: string | null;
  escrow_status: string | null;
  tracking_code: string | null;
  created_at: string | null;
};

type Ticket = {
  id: string;
  user_id: string;
  category: string;
  subject: string;
  description: string;
  order_id: string | null;
  stream_id: string | null;
  status: string | null;
  priority: string | null;
  admin_response: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  user: Person | null;
  order: Order | null;
};

type ApiResponse = {
  success: boolean;
  tickets: Ticket[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  error?: string;
};

const STATUSES = [
  ["all", "Tous les statuts"],
  ["open", "Ouverts"],
  ["in_progress", "En cours"],
  ["resolved", "Résolus"],
  ["closed", "Fermés"],
];

const CATEGORIES = [
  ["all", "Toutes les catégories"],
  ["purchase", "Achats"],
  ["payment", "Paiements"],
  ["transaction", "Transactions"],
  ["delivery", "Livraisons"],
];

const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Résolu",
  closed: "Fermé",
};

const STATUS_STYLES: Record<string, string> = {
  open: "border-red-500/20 bg-red-500/10 text-red-300",
  in_progress: "border-amber-500/20 bg-amber-500/10 text-amber-300",
  resolved: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  closed: "border-gray-500/20 bg-gray-500/10 text-gray-300",
};

const CATEGORY_LABELS: Record<string, string> = {
  purchase: "Achat",
  payment: "Paiement",
  transaction: "Transaction",
  delivery: "Livraison",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Faible",
  normal: "Normale",
  high: "Élevée",
  urgent: "Urgente",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "text-gray-400",
  normal: "text-blue-300",
  high: "text-orange-300",
  urgent: "text-red-300",
};

function formatDate(value: string | null) {
  if (!value) return "Non renseignée";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function formatMoney(value: number, currency: string | null) {
  return (
    new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: 2,
    }).format(Number(value || 0)) +
    " " +
    (currency || "XOF")
  );
}

function personName(person: Person | null) {
  if (!person) return "Utilisateur indisponible";

  return (
    person.full_name ||
    (person.username ? `@${person.username}` : null) ||
    person.email ||
    "Utilisateur"
  );
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <div className="mt-1 text-sm text-gray-200">{children}</div>
    </div>
  );
}

export default function AdminDisputesPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [copied, setCopied] = useState("");

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
      });

      if (status !== "all") {
        params.set("status", status);
      }

      if (category !== "all") {
        params.set("category", category);
      }

      if (search.trim()) {
        params.set("q", search.trim());
      }

      const response = await fetch(
        `/api/admin/disputes?${params.toString()}`,
        { cache: "no-store" }
      );

      const result = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          result.error || "Impossible de charger les réclamations."
        );
      }

      setTickets(result.tickets ?? []);
      setTotal(result.total ?? 0);
      setTotalPages(result.totalPages ?? 1);

      if (selected) {
        const updated = (result.tickets ?? []).find(
          (ticket) => ticket.id === selected.id
        );

        if (updated) setSelected(updated);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }, [page, status, category, search, selected]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTickets();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadTickets]);

  async function copyValue(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);

      window.setTimeout(() => setCopied(""), 1500);
    } catch {
      setError("Impossible de copier cet identifiant.");
    }
  }

  const openCount = tickets.filter(
    (ticket) => ticket.status === "open"
  ).length;

  const progressCount = tickets.filter(
    (ticket) => ticket.status === "in_progress"
  ).length;

  const urgentCount = tickets.filter(
    (ticket) => ticket.priority === "urgent"
  ).length;

  return (
    <main className="min-h-screen bg-[#080b12] px-4 py-7 text-white sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-red-500/10 p-3 text-red-300">
              <ShieldAlert size={25} />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-purple-300">
                MOSHI ADMIN
              </p>
              <h1 className="text-2xl font-bold">
                Réclamations et litiges
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Supervision des problèmes liés aux achats et paiements.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => void loadTickets()}
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

        <section className="mt-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#111722] p-5">
            <p className="text-sm text-gray-400">Ouverts sur cette page</p>
            <p className="mt-3 text-3xl font-bold">{openCount}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111722] p-5">
            <p className="text-sm text-gray-400">En cours sur cette page</p>
            <p className="mt-3 text-3xl font-bold">{progressCount}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111722] p-5">
            <p className="text-sm text-gray-400">Urgents sur cette page</p>
            <p className="mt-3 text-3xl font-bold text-red-300">
              {urgentCount}
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
                placeholder="Rechercher un sujet, un dossier ou un identifiant..."
                className="w-full rounded-xl border border-white/10 bg-[#080b12] py-3 pl-10 pr-4 text-sm outline-none focus:border-purple-400"
              />
            </div>

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-white/10 bg-[#080b12] px-4 py-3 text-sm outline-none"
            >
              {STATUSES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-white/10 bg-[#080b12] px-4 py-3 text-sm outline-none"
            >
              {CATEGORIES.map(([value, label]) => (
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
              Chargement des réclamations...
            </div>
          ) : tickets.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#111722] p-12 text-center">
              <MessageSquare
                className="mx-auto mb-3 text-gray-500"
                size={32}
              />
              <p className="font-semibold">Aucune réclamation trouvée</p>
              <p className="mt-1 text-sm text-gray-500">
                Les réclamations correspondant à tes filtres apparaîtront ici.
              </p>
            </div>
          ) : (
            tickets.map((ticket) => {
              const currentStatus = ticket.status || "open";

              return (
                <article
                  key={ticket.id}
                  className="rounded-2xl border border-white/10 bg-[#111722] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-gray-500">
                          Dossier #{ticket.id.slice(0, 8)}
                        </span>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs ${
                            STATUS_STYLES[currentStatus] ||
                            "border-white/10 text-gray-300"
                          }`}
                        >
                          {STATUS_LABELS[currentStatus] || currentStatus}
                        </span>
                      </div>

                      <h2 className="mt-3 text-lg font-bold">
                        {ticket.subject}
                      </h2>

                      <p className="mt-1 line-clamp-2 text-sm text-gray-400">
                        {ticket.description}
                      </p>
                    </div>

                    <span
                      className={`text-xs font-semibold ${
                        PRIORITY_STYLES[ticket.priority || "normal"] ||
                        "text-gray-400"
                      }`}
                    >
                      Priorité :{" "}
                      {PRIORITY_LABELS[ticket.priority || "normal"] ||
                        ticket.priority ||
                        "Normale"}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Detail label="Acheteur">
                      <span className="flex items-center gap-2">
                        <UserRound size={15} className="text-gray-500" />
                        {personName(ticket.user)}
                      </span>
                    </Detail>

                    <Detail label="Catégorie">
                      {CATEGORY_LABELS[ticket.category] ||
                        ticket.category}
                    </Detail>

                    <Detail label="Date d'ouverture">
                      <span className="flex items-center gap-2">
                        <Clock3 size={14} className="text-gray-500" />
                        {formatDate(ticket.created_at)}
                      </span>
                    </Detail>

                    <Detail label="Commande associée">
                      {ticket.order ? (
                        <span className="font-semibold text-emerald-300">
                          {formatMoney(
                            ticket.order.total_amount,
                            ticket.order.currency
                          )}
                        </span>
                      ) : (
                        "Aucune commande associée"
                      )}
                    </Detail>
                  </div>

                  {ticket.order && (
                    <div className="mt-4 rounded-xl border border-white/10 bg-[#080b12] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs text-gray-500">
                            Commande #{ticket.order.id.slice(0, 8)}
                          </p>
                          <p className="mt-1 text-sm">
                            Statut :{" "}
                            <strong>
                              {ticket.order.status || "Non renseigné"}
                            </strong>
                          </p>
                        </div>

                        <div className="text-sm text-gray-400">
                          Séquestre :{" "}
                          <strong className="text-white">
                            {ticket.order.escrow_status || "Non renseigné"}
                          </strong>
                        </div>
                      </div>

                      {ticket.order.tracking_code && (
                        <p className="mt-2 text-xs text-gray-500">
                          Suivi : {ticket.order.tracking_code}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      {ticket.order_id && (
                        <span className="flex items-center gap-1">
                          <Package size={14} />
                          Commande liée
                        </span>
                      )}

                      {ticket.category === "payment" && (
                        <span className="flex items-center gap-1">
                          <CreditCard size={14} />
                          Paiement
                        </span>
                      )}

                      {ticket.category === "delivery" && (
                        <span className="flex items-center gap-1">
                          <Truck size={14} />
                          Livraison
                        </span>
                      )}

                      {ticket.resolved_at && (
                        <span className="flex items-center gap-1 text-emerald-300">
                          <CheckCircle2 size={14} />
                          Résolu le {formatDate(ticket.resolved_at)}
                        </span>
                      )}

                      {currentStatus === "open" && (
                        <span className="flex items-center gap-1 text-red-300">
                          <AlertTriangle size={14} />
                          Intervention nécessaire
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void copyValue(ticket.id)}
                        className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs hover:bg-white/5"
                      >
                        <Copy size={13} />
                        {copied === ticket.id ? "Copié" : "Copier ID"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelected(ticket)}
                        className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold hover:bg-purple-500"
                      >
                        Examiner le dossier
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>

        <footer className="mt-7 flex items-center justify-between border-t border-white/10 pt-5">
          <p className="text-xs text-gray-500">
            {total} dossier(s) · {tickets.length} affiché(s)
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

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#111722] p-5 sm:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-purple-300">
                  DOSSIER DE RÉCLAMATION
                </p>
                <h2 className="mt-2 text-xl font-bold">
                  {selected.subject}
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Référence : {selected.id}
                </p>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm"
              >
                Fermer
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Detail label="Utilisateur">
                {personName(selected.user)}
              </Detail>

              <Detail label="Email">
                {selected.user?.email || "Non renseigné"}
              </Detail>

              <Detail label="Téléphone">
                {selected.user?.phone || "Non renseigné"}
              </Detail>

              <Detail label="Pays">
                {selected.user?.country || "Non renseigné"}
              </Detail>

              <Detail label="Catégorie">
                {CATEGORY_LABELS[selected.category] || selected.category}
              </Detail>

              <Detail label="Priorité">
                {PRIORITY_LABELS[selected.priority || "normal"] ||
                  selected.priority ||
                  "Normale"}
              </Detail>

              <Detail label="Statut">
                {STATUS_LABELS[selected.status || "open"] ||
                  selected.status}
              </Detail>

              <Detail label="Créé le">
                {formatDate(selected.created_at)}
              </Detail>
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Description de la réclamation
              </p>
              <div className="mt-2 whitespace-pre-wrap rounded-xl border border-white/10 bg-[#080b12] p-4 text-sm leading-7 text-gray-200">
                {selected.description}
              </div>
            </div>

            {selected.admin_response && (
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Réponse administrative existante
                </p>
                <div className="mt-2 whitespace-pre-wrap rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm leading-7 text-gray-200">
                  {selected.admin_response}
                </div>
              </div>
            )}

            {selected.order && (
              <div className="mt-5 rounded-xl border border-white/10 bg-[#080b12] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Commande associée
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Detail label="Identifiant">
                    {selected.order.id}
                  </Detail>

                  <Detail label="Montant">
                    {formatMoney(
                      selected.order.total_amount,
                      selected.order.currency
                    )}
                  </Detail>

                  <Detail label="Statut de commande">
                    {selected.order.status || "Non renseigné"}
                  </Detail>

                  <Detail label="Statut du séquestre">
                    {selected.order.escrow_status || "Non renseigné"}
                  </Detail>

                  <Detail label="Numéro de suivi">
                    {selected.order.tracking_code || "Non renseigné"}
                  </Detail>
                </div>
              </div>
            )}

            <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-6 text-amber-200">
              Cette interface est actuellement en consultation. Aucun
              remboursement, changement de statut de commande ou
              déblocage de fonds n'est déclenché depuis cette fenêtre.
              Ces opérations nécessitent une validation financière
              sécurisée côté serveur.
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

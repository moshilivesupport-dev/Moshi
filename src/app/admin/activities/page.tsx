
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Ban,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  UserCheck,
  XCircle,
} from "lucide-react";

type ActivityAction =
  | "user_suspended"
  | "user_reactivated"
  | "verification_approved"
  | "verification_rejected";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

type ActivityLog = {
  id: string;
  admin_user_id: string | null;
  target_user_id: string | null;
  action: ActivityAction;
  reason: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  admin: Profile | null;
  target: Profile | null;
};

type ActivitiesResponse = {
  activities: ActivityLog[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const ACTIONS: {
  value: string;
  label: string;
}[] = [
  { value: "all", label: "Toutes les activités" },
  { value: "user_suspended", label: "Comptes suspendus" },
  { value: "user_reactivated", label: "Comptes réactivés" },
  {
    value: "verification_approved",
    label: "Certifications approuvées",
  },
  {
    value: "verification_rejected",
    label: "Certifications refusées",
  },
];

const ACTION_LABELS: Record<ActivityAction, string> = {
  user_suspended: "Suspension de compte",
  user_reactivated: "Réactivation de compte",
  verification_approved: "Certification approuvée",
  verification_rejected: "Certification refusée",
};

function getDisplayName(profile: Profile | null) {
  if (!profile) return "Utilisateur inconnu";

  return (
    profile.full_name ||
    (profile.username ? `@${profile.username}` : null) ||
    "Utilisateur"
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

function getActionIcon(action: ActivityAction) {
  switch (action) {
    case "user_suspended":
      return Ban;
    case "user_reactivated":
      return UserCheck;
    case "verification_approved":
      return BadgeCheck;
    case "verification_rejected":
      return XCircle;
    default:
      return Activity;
  }
}

function getActionColor(action: ActivityAction) {
  switch (action) {
    case "user_suspended":
    case "verification_rejected":
      return "border-red-500/20 bg-red-500/10 text-red-300";

    case "user_reactivated":
    case "verification_approved":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";

    default:
      return "border-white/10 bg-white/5 text-gray-300";
  }
}

function getActionDescription(action: ActivityAction) {
  switch (action) {
    case "user_suspended":
      return "Un compte utilisateur a été suspendu.";

    case "user_reactivated":
      return "Un compte utilisateur a été réactivé.";

    case "verification_approved":
      return "Une demande de certification a été acceptée.";

    case "verification_rejected":
      return "Une demande de certification a été refusée.";

    default:
      return "Une opération administrative a été effectuée.";
  }
}

function ProfileIdentity({
  profile,
  fallbackId,
  label,
}: {
  profile: Profile | null;
  fallbackId: string | null;
  label: string;
}) {
  const displayName = getDisplayName(profile);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#202a3a]">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <User size={18} className="text-gray-400" />
        )}
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
          {label}
        </p>

        <p className="truncate text-sm font-semibold text-white">
          {displayName}
        </p>

        {profile?.role && (
          <p className="text-xs capitalize text-gray-500">
            {profile.role}
          </p>
        )}

        {!profile && fallbackId && (
          <p className="truncate text-xs text-gray-500">
            ID : {fallbackId}
          </p>
        )}
      </div>
    </div>
  );
}

export default function AdminActivitiesPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadActivities = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
        });

        if (search.trim()) {
          params.set("q", search.trim());
        }

        if (action !== "all") {
          params.set("action", action);
        }

        const response = await fetch(
          `/api/admin/activities?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Impossible de charger le journal administratif."
          );
        }

        const data = result as ActivitiesResponse;

        setActivities(data.activities ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      } catch (err) {
        console.error("Admin activities:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Une erreur est survenue."
        );

        setActivities([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, search, action]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadActivities();
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [loadActivities]);

  useEffect(() => {
    setPage(1);
  }, [search, action]);

  const suspendedCount = activities.filter(
    (item) => item.action === "user_suspended"
  ).length;

  const reactivatedCount = activities.filter(
    (item) => item.action === "user_reactivated"
  ).length;

  const approvedCount = activities.filter(
    (item) => item.action === "verification_approved"
  ).length;

  const rejectedCount = activities.filter(
    (item) => item.action === "verification_rejected"
  ).length;

  return (
    <main className="min-h-screen bg-[#080b12] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300">
              <Activity size={25} />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-purple-300">
                MOSHI ADMIN
              </p>

              <h1 className="text-xl font-bold sm:text-2xl">
                Journal administratif
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => loadActivities(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Actualiser
            </button>

            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10"
            >
              <ArrowLeft size={16} />
              Tableau de bord
            </Link>
          </div>
        </header>

        {/* INTRODUCTION */}
        <section className="mt-8">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Historique des opérations
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
            Retrouvez les décisions prises par les administrateurs
            sur les comptes et les demandes de certification.
            Chaque événement enregistré conserve son responsable,
            son motif et sa date.
          </p>
        </section>

        {/* STATISTICS */}
        <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[#111722] p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 sm:text-sm">
                Total filtré
              </span>
              <Activity size={19} className="text-purple-300" />
            </div>

            <p className="mt-3 text-2xl font-bold tabular-nums sm:text-3xl">
              {total}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Événements enregistrés
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111722] p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 sm:text-sm">
                Suspensions
              </span>
              <Ban size={19} className="text-red-300" />
            </div>

            <p className="mt-3 text-2xl font-bold tabular-nums sm:text-3xl">
              {suspendedCount}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Sur cette page
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111722] p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 sm:text-sm">
                Réactivations
              </span>
              <UserCheck size={19} className="text-emerald-300" />
            </div>

            <p className="mt-3 text-2xl font-bold tabular-nums sm:text-3xl">
              {reactivatedCount}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Sur cette page
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111722] p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 sm:text-sm">
                Certifications
              </span>
              <BadgeCheck size={19} className="text-blue-300" />
            </div>

            <p className="mt-3 text-2xl font-bold tabular-nums sm:text-3xl">
              {approvedCount + rejectedCount}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              {approvedCount} acceptées · {rejectedCount} refusées
            </p>
          </div>
        </section>

        {/* FILTERS */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-[#111722] p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_260px]">
            <div>
              <label
                htmlFor="activity-search"
                className="mb-2 block text-xs font-semibold text-gray-400"
              >
                Rechercher dans les motifs
              </label>

              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />

                <input
                  id="activity-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher une raison..."
                  className="w-full rounded-xl border border-white/10 bg-[#080b12] py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-400/60"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="activity-filter"
                className="mb-2 block text-xs font-semibold text-gray-400"
              >
                Type d'activité
              </label>

              <select
                id="activity-filter"
                value={action}
                onChange={(event) => setAction(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#080b12] px-3 py-3 text-sm text-white outline-none focus:border-purple-400/60"
              >
                {ACTIONS.map((item) => (
                  <option
                    key={item.value}
                    value={item.value}
                    className="bg-[#111722]"
                  >
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
            <p className="text-xs text-gray-500">
              {total} résultat{total > 1 ? "s" : ""} trouvé
              {total > 1 ? "s" : ""}
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setAction("all");
                setPage(1);
              }}
              className="text-xs font-semibold text-purple-300 transition hover:text-purple-200"
            >
              Réinitialiser les filtres
            </button>
          </div>
        </section>

        {/* ACTIVITY LIST */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">
                Événements enregistrés
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                Page {page} sur {totalPages}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock size={15} />
              Plus récents en premier
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#111722]">
              <RefreshCw
                size={25}
                className="animate-spin text-purple-300"
              />

              <p className="mt-3 text-sm text-gray-400">
                Chargement du journal...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
              <XCircle
                size={28}
                className="mx-auto text-red-300"
              />

              <p className="mt-3 font-semibold text-red-200">
                Impossible de charger les activités
              </p>

              <p className="mt-2 text-sm text-gray-400">
                {error}
              </p>

              <button
                type="button"
                onClick={() => loadActivities(true)}
                className="mt-4 rounded-xl bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20"
              >
                Réessayer
              </button>
            </div>
          ) : activities.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#111722] px-5 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-gray-500">
                <Activity size={27} />
              </div>

              <h3 className="mt-4 font-bold">
                Aucune activité trouvée
              </h3>

              <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                Aucun événement ne correspond à tes filtres.
                Les nouvelles suspensions, réactivations et décisions
                de certification apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((item) => {
                const Icon = getActionIcon(item.action);

                return (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-[#111722] p-4 transition hover:border-white/20 sm:p-5"
                  >
                    {/* EVENT TITLE */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${getActionColor(item.action)}`}
                        >
                          <Icon size={21} />
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-bold">
                            {ACTION_LABELS[item.action] ||
                              "Opération administrative"}
                          </h3>

                          <p className="mt-1 text-xs text-gray-500">
                            {getActionDescription(item.action)}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1.5 text-[10px] font-bold ${getActionColor(item.action)}`}
                      >
                        {ACTION_LABELS[item.action]?.toUpperCase() ||
                          "ACTIVITÉ"}
                      </span>
                    </div>

                    {/* PEOPLE */}
                    <div className="mt-5 grid gap-5 border-t border-white/10 pt-5 sm:grid-cols-2">
                      <ProfileIdentity
                        profile={item.admin}
                        fallbackId={item.admin_user_id}
                        label="Administrateur responsable"
                      />

                      <ProfileIdentity
                        profile={item.target}
                        fallbackId={item.target_user_id}
                        label="Utilisateur concerné"
                      />
                    </div>

                    {/* REASON */}
                    <div className="mt-5 rounded-xl border border-white/[0.06] bg-[#080b12] p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                        Motif / note administrative
                      </p>

                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-300">
                        {item.reason || "Aucun motif renseigné."}
                      </p>
                    </div>

                    {/* CERTIFICATION METADATA */}
                    {item.metadata?.verification_request_id && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <BadgeCheck size={15} className="text-blue-300" />

                        <span>
                          Référence de demande :
                        </span>

                        <span className="break-all font-mono text-gray-400">
                          {String(
                            item.metadata.verification_request_id
                          )}
                        </span>
                      </div>
                    )}

                    {/* DATE */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock size={15} />
                        {formatDate(item.created_at)}
                      </div>

                      <span className="font-mono text-[10px] text-gray-600">
                        ID : {item.id.slice(0, 8)}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* PAGINATION */}
          {!loading && !error && totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#111722] p-4">
              <p className="text-xs text-gray-500">
                Page {page} / {totalPages}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((current) => Math.max(1, current - 1))
                  }
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowLeft size={16} />
                  Précédent
                </button>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() =>
                    setPage((current) =>
                      Math.min(totalPages, current + 1)
                    )
                  }
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Suivant
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* SECURITY FOOTER */}
        <footer className="mt-10 rounded-2xl border border-blue-500/15 bg-blue-500/[0.04] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck
              size={21}
              className="mt-0.5 shrink-0 text-blue-300"
            />

            <div>
              <h3 className="text-sm font-bold text-blue-200">
                Journal administratif sécurisé
              </h3>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Cet espace est réservé aux administrateurs autorisés.
                Les événements affichés proviennent des opérations
                effectivement enregistrées dans la base de données.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

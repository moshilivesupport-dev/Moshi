
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  Search,
  RefreshCw,
  ShieldCheck,
  ShieldBan,
  UserRound,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ClipboardList,
  Clock3,
} from "lucide-react";

type ProfileSummary = {
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
  action: "user_suspended" | "user_reactivated";
  reason: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  admin: ProfileSummary | null;
  target: ProfileSummary | null;
};

type ActivitiesResponse = {
  activities: ActivityLog[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export default function AdminActivitiesPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        action,
      });

      if (search.trim()) {
        params.set("q", search.trim());
      }

      const response = await fetch(
        `/api/admin/activities?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Impossible de charger le journal."
        );
      }

      const data = result as ActivitiesResponse;

      setActivities(data.activities || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }, [page, action, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadActivities();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [loadActivities]);

  const changeSearch = (value: string) => {
    setPage(1);
    setSearch(value);
  };

  const changeAction = (value: string) => {
    setPage(1);
    setAction(value);
  };

  const suspensions = activities.filter(
    (item) => item.action === "user_suspended"
  ).length;

  const reactivations = activities.filter(
    (item) => item.action === "user_reactivated"
  ).length;

  return (
    <main className="min-h-screen bg-[#080b12] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* HEADER */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="mb-4 inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
            >
              <ArrowLeft size={17} />
              Retour à l'administration
            </Link>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-purple-500/10 p-3 text-purple-300">
                <Activity size={25} />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-purple-300">
                  MOSHI ADMIN
                </p>
                <h1 className="text-2xl font-bold sm:text-3xl">
                  Journal administratif
                </h1>
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-sm text-gray-400">
              Consulte les opérations sensibles réalisées par
              les administrateurs de la plateforme.
            </p>
          </div>

          <button
            type="button"
            onClick={loadActivities}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold transition hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Actualiser
          </button>
        </header>

        {/* STATISTICS */}
        <section className="mb-7 grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Opérations enregistrées"
            value={total}
            icon={<ClipboardList size={22} />}
          />

          <StatCard
            title="Suspensions sur cette page"
            value={suspensions}
            icon={<ShieldBan size={22} />}
          />

          <StatCard
            title="Réactivations sur cette page"
            value={reactivations}
            icon={<ShieldCheck size={22} />}
          />
        </section>

        {/* FILTERS */}
        <section className="mb-6 rounded-2xl border border-white/10 bg-[#111722] p-4">
          <div className="grid gap-4 md:grid-cols-[1fr_240px]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
              />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  changeSearch(event.target.value)
                }
                placeholder="Rechercher dans les motifs..."
                className="h-12 w-full rounded-xl border border-white/10 bg-[#080b12] pl-11 pr-4 text-sm text-white outline-none placeholder:text-gray-600 focus:border-purple-400"
              />
            </div>

            <select
              value={action}
              onChange={(event) =>
                changeAction(event.target.value)
              }
              className="h-12 rounded-xl border border-white/10 bg-[#080b12] px-4 text-sm text-white outline-none focus:border-purple-400"
            >
              <option value="all">Toutes les opérations</option>
              <option value="user_suspended">Suspensions</option>
              <option value="user_reactivated">Réactivations</option>
            </select>
          </div>
        </section>

        {/* ERROR */}
        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* CONTENT */}
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-[#111722] py-20 text-center text-gray-400">
            <RefreshCw
              size={25}
              className="mx-auto mb-3 animate-spin"
            />
            Chargement du journal...
          </div>
        ) : activities.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#111722] px-5 py-16 text-center">
            <Activity
              size={40}
              className="mx-auto mb-4 text-gray-500"
            />

            <h2 className="font-semibold">
              Aucune activité trouvée
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              Les suspensions et réactivations enregistrées
              apparaîtront ici.
            </p>
          </div>
        ) : (
          <section className="space-y-4">
            {activities.map((item) => {
              const isSuspension =
                item.action === "user_suspended";

              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-[#111722] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-xl p-3 ${
                          isSuspension
                            ? "bg-red-500/10 text-red-300"
                            : "bg-green-500/10 text-green-300"
                        }`}
                      >
                        {isSuspension ? (
                          <ShieldBan size={22} />
                        ) : (
                          <ShieldCheck size={22} />
                        )}
                      </div>

                      <div>
                        <h2 className="font-bold">
                          {isSuspension
                            ? "Suspension de compte"
                            : "Réactivation de compte"}
                        </h2>

                        <p className="mt-1 text-xs text-gray-500">
                          Référence : {item.id}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                        isSuspension
                          ? "bg-red-500/10 text-red-300"
                          : "bg-green-500/10 text-green-300"
                      }`}
                    >
                      {isSuspension
                        ? "SUSPENSION"
                        : "RÉACTIVATION"}
                    </span>
                  </div>

                  {/* PEOPLE */}
                  <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2">
                    <PersonBlock
                      label="Administrateur responsable"
                      profile={item.admin}
                      fallbackId={item.admin_user_id}
                    />

                    <PersonBlock
                      label="Compte concerné"
                      profile={item.target}
                      fallbackId={item.target_user_id}
                    />
                  </div>

                  {/* REASON */}
                  <div className="mt-5 rounded-xl border border-white/[0.06] bg-[#080b12] p-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Motif administratif
                    </p>

                    <p className="whitespace-pre-wrap text-sm leading-6 text-gray-300">
                      {item.reason}
                    </p>
                  </div>

                  {/* DATE */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-2">
                      <CalendarDays size={15} />
                      {formatDate(item.created_at)}
                    </span>

                    <span className="flex items-center gap-2">
                      <Clock3 size={15} />
                      {formatTime(item.created_at)}
                    </span>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {/* PAGINATION */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#111722] p-4">
          <p className="text-xs text-gray-400">
            Page {page} sur {totalPages} · {total} opération(s)
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setPage((value) => Math.max(1, value - 1))
              }
              disabled={page <= 1 || loading}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-gray-300 hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
              Précédent
            </button>

            <button
              type="button"
              onClick={() =>
                setPage((value) =>
                  Math.min(totalPages, value + 1)
                )
              }
              disabled={page >= totalPages || loading}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-gray-300 hover:bg-white/5 disabled:opacity-30"
            >
              Suivant
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* SECURITY */}
        <section className="mt-8 rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck
              size={21}
              className="mt-0.5 shrink-0 text-blue-300"
            />

            <div>
              <h3 className="font-semibold text-blue-200">
                Journal protégé
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-400">
                Ce journal est consultable uniquement par les
                administrateurs autorisés. Les événements affichés
                correspondent aux actions actuellement enregistrées
                dans la base de données. Les opérations non encore
                raccordées au journal ne sont pas affichées ici.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111722] p-5">
      <div className="flex items-center justify-between text-gray-400">
        <span className="text-sm">{title}</span>
        <span className="rounded-xl bg-purple-500/10 p-3 text-purple-300">
          {icon}
        </span>
      </div>

      <p className="mt-4 text-3xl font-bold tabular-nums">
        {value}
      </p>
    </div>
  );
}

function PersonBlock({
  label,
  profile,
  fallbackId,
}: {
  label: string;
  profile: ProfileSummary | null;
  fallbackId: string | null;
}) {
  const displayName =
    profile?.full_name ||
    profile?.username ||
    "Profil indisponible";

  return (
    <div className="min-w-0">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5 text-gray-400">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <UserRound size={19} />
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-200">
            {displayName}
          </p>

          <p className="truncate text-xs text-gray-500">
            {profile?.username
              ? `@${profile.username}`
              : fallbackId || "Identifiant indisponible"}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date indisponible";
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

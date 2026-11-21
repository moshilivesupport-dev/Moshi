
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
  Globe,
  Loader2,
} from "lucide-react";

type ActivityAction =
  | "user_suspended"
  | "user_reactivated"
  | "verification_approved"
  | "verification_rejected"
  | "country_change_in_progress"
  | "country_change_approved"
  | "country_change_rejected";

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

type ApiResponse = {
  activities?: ActivityLog[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  error?: string;
};

const PAGE_SIZE = 25;

const ACTIONS: {
  value: string;
  label: string;
}[] = [
  { value: "all", label: "Toutes les activités" },
  { value: "user_suspended", label: "Comptes suspendus" },
  { value: "user_reactivated", label: "Comptes réactivés" },
  { value: "verification_approved", label: "Certifications approuvées" },
  { value: "verification_rejected", label: "Certifications refusées" },
  {
    value: "country_change_in_progress",
    label: "Pays : en cours",
  },
  {
    value: "country_change_approved",
    label: "Pays : approuvés",
  },
  {
    value: "country_change_rejected",
    label: "Pays : refusés",
  },
];

const ACTION_CONFIG: Record<
  ActivityAction,
  {
    label: string;
    description: string;
    color: string;
    icon: typeof Activity;
  }
> = {
  user_suspended: {
    label: "Compte suspendu",
    description: "Un compte utilisateur a été suspendu.",
    color: "text-red-400 bg-red-500/10 border-red-500/20",
    icon: Ban,
  },
  user_reactivated: {
    label: "Compte réactivé",
    description: "Un compte utilisateur a été réactivé.",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    icon: UserCheck,
  },
  verification_approved: {
    label: "Certification approuvée",
    description: "Une demande de certification a été approuvée.",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    icon: BadgeCheck,
  },
  verification_rejected: {
    label: "Certification refusée",
    description: "Une demande de certification a été refusée.",
    color: "text-red-400 bg-red-500/10 border-red-500/20",
    icon: XCircle,
  },
  country_change_in_progress: {
    label: "Changement de pays en cours",
    description: "Une demande de changement de pays est en cours de traitement.",
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    icon: Clock,
  },
  country_change_approved: {
    label: "Changement de pays approuvé",
    description: "Le pays d'un compte utilisateur a été modifié.",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    icon: Globe,
  },
  country_change_rejected: {
    label: "Changement de pays refusé",
    description: "Une demande de changement de pays a été refusée.",
    color: "text-red-400 bg-red-500/10 border-red-500/20",
    icon: XCircle,
  },
};

function getDisplayName(profile: Profile | null, fallbackId: string | null) {
  if (!profile) {
    return fallbackId
      ? `Utilisateur ${fallbackId.slice(0, 8)}`
      : "Utilisateur inconnu";
  }

  return (
    profile.full_name ||
    (profile.username ? `@${profile.username}` : null) ||
    `Utilisateur ${profile.id.slice(0, 8)}`
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

function ProfileIdentity({
  profile,
  fallbackId,
  label,
}: {
  profile: Profile | null;
  fallbackId: string | null;
  label: string;
}) {
  const displayName = getDisplayName(profile, fallbackId);

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-700 bg-slate-800">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <User size={18} />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">
          {displayName}
        </p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function MetadataDetails({
  metadata,
  action,
}: {
  metadata: Record<string, unknown> | null;
  action: ActivityAction;
}) {
  if (!metadata) return null;

  const oldCountry =
    typeof metadata.old_country === "string"
      ? metadata.old_country
      : null;

  const newCountry =
    typeof metadata.new_country === "string"
      ? metadata.new_country
      : null;

  const ticketId =
    typeof metadata.ticket_id === "string"
      ? metadata.ticket_id
      : null;

  const verificationId =
    typeof metadata.verification_request_id === "string"
      ? metadata.verification_request_id
      : null;

  if (
    !oldCountry &&
    !newCountry &&
    !ticketId &&
    !verificationId
  ) {
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Détails de l'opération
      </p>

      {oldCountry && newCountry && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-slate-300">
            {oldCountry}
          </span>
          <ArrowRight size={15} className="text-cyan-400" />
          <span className="rounded-lg bg-cyan-500/10 px-3 py-1.5 font-semibold text-cyan-300">
            {newCountry}
          </span>
        </div>
      )}

      {ticketId && (
        <p className="mt-2 break-all text-xs text-slate-500">
          Demande de changement de pays : {ticketId}
        </p>
      )}

      {verificationId && (
        <p className="mt-2 break-all text-xs text-slate-500">
          Demande de certification : {verificationId}
        </p>
      )}
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
    async (options?: { silent?: boolean }) => {
      if (options?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
        });

        if (action !== "all") {
          params.set("action", action);
        }

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

        const result: ApiResponse = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Impossible de charger le journal."
          );
        }

        setActivities(result.activities ?? []);
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
        setRefreshing(false);
      }
    },
    [page, action, search]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadActivities();
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [loadActivities]);

  useEffect(() => {
    setPage(1);
  }, [action, search]);

  const handleRefresh = () => {
    loadActivities({ silent: true });
  };

  const currentPageSuspensions = activities.filter(
    (item) => item.action === "user_suspended"
  ).length;

  const currentPageCertifications = activities.filter(
    (item) =>
      item.action === "verification_approved" ||
      item.action === "verification_rejected"
  ).length;

  const currentPageCountryChanges = activities.filter(
    (item) =>
      item.action === "country_change_approved" ||
      item.action === "country_change_rejected" ||
      item.action === "country_change_in_progress"
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <Link
            href="/admin"
            className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            Retour au tableau de bord
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex items-center gap-2 text-cyan-400">
                <ShieldCheck size={19} />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">
                  MOSHI ADMINISTRATION
                </span>
              </div>

              <h1 className="text-2xl font-bold sm:text-3xl">
                Journal administratif
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Consulte les actions réalisées par les administrateurs
                sur les comptes, les certifications et les changements
                de pays.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Actualiser
            </button>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Total des opérations</p>
              <Activity className="text-cyan-400" size={20} />
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums">
              {total.toLocaleString("fr-FR")}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Résultats correspondant aux filtres
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Suspensions</p>
              <Ban className="text-red-400" size={20} />
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums">
              {currentPageSuspensions}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Sur cette page
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Certifications</p>
              <BadgeCheck className="text-emerald-400" size={20} />
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums">
              {currentPageCertifications}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Sur cette page
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">Changements de pays</p>
              <Globe className="text-cyan-400" size={20} />
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums">
              {currentPageCountryChanges}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Sur cette page
            </p>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_280px]">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher dans les motifs..."
                maxLength={80}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
              />
            </div>

            <select
              value={action}
              onChange={(event) => setAction(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-cyan-500"
            >
              {ACTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              {total.toLocaleString("fr-FR")} résultat(s)
            </span>
            <span>
              {PAGE_SIZE} opérations maximum par page
            </span>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
          >
            <XCircle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Erreur de chargement</p>
              <p className="mt-1">{error}</p>
              <button
                type="button"
                onClick={handleRefresh}
                className="mt-3 font-semibold underline underline-offset-4"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
            <Loader2 className="mb-3 animate-spin text-cyan-400" size={30} />
            <p className="text-sm text-slate-400">
              Chargement du journal administratif...
            </p>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 px-5 text-center">
            <div className="mb-4 rounded-2xl bg-slate-800 p-4">
              <Activity size={28} className="text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold">
              Aucune activité trouvée
            </h2>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              Aucune opération ne correspond à cette recherche.
              Essaie un autre filtre ou une autre expression.
            </p>
          </div>
        ) : (
          <section className="space-y-3">
            {activities.map((item) => {
              const config = ACTION_CONFIG[item.action];
              const Icon = config.icon;

              return (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-4 transition hover:border-slate-700 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${config.color}`}
                      >
                        <Icon size={20} />
                      </div>

                      <div className="min-w-0">
                        <h2 className="font-semibold text-white">
                          {config.label}
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                          {config.description}
                        </p>
                      </div>
                    </div>

                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock size={13} />
                      {formatDate(item.created_at)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 border-t border-slate-800 pt-4 sm:grid-cols-2">
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

                  <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Motif / réponse administrative
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
                      {item.reason || "Aucun motif renseigné."}
                    </p>
                  </div>

                  <MetadataDetails
                    metadata={item.metadata}
                    action={item.action}
                  />

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
                    <span className="text-xs text-slate-600">
                      Référence : {item.id.slice(0, 12)}
                    </span>

                    <span className="text-xs text-slate-500">
                      Événement enregistré dans le journal sécurisé
                    </span>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {!loading && totalPages > 1 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm text-slate-400">
              Page{" "}
              <span className="font-semibold text-white">{page}</span>
              {" "}sur{" "}
              <span className="font-semibold text-white">
                {totalPages}
              </span>
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft size={15} />
                Précédent
              </button>

              <button
                type="button"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={page >= totalPages || loading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Suivant
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        <footer className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck size={19} className="mt-0.5 shrink-0 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-slate-300">
                Journal administratif sécurisé
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Les opérations sont enregistrées côté serveur.
                Cette interface permet uniquement leur consultation.
                Les événements affichés dépendent des actions réellement
                enregistrées dans la base de données.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

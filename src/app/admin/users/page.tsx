
"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Search,
  RefreshCw,
  Users,
  Store,
  UserRound,
  ShieldCheck,
  ShieldBan,
  ShieldCheckIcon,
  ChevronLeft,
  ChevronRight,
  Mail,
  MapPin,
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  BadgeCheck,
} from "lucide-react";

type AdminUser = {
  id: string;
  email: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  country: string | null;
  phone: string | null;
  is_verified: boolean | null;
  seller_status: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  is_suspended: boolean;
  banned_until: string | null;
  is_admin: boolean;
};

type UsersResponse = {
  users: AdminUser[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        role,
      });

      if (search.trim()) {
        params.set("q", search.trim());
      }

      const response = await fetch(
        `/api/admin/users?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Impossible de charger les utilisateurs."
        );
      }

      const data = result as UsersResponse;

      setUsers(data.users || []);
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
  }, [page, role, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  const changeFilter = (value: string) => {
    setPage(1);
    setRole(value);
  };

  const changeSearch = (value: string) => {
    setPage(1);
    setSearch(value);
  };

  const changeStatus = async (
    user: AdminUser,
    action: "suspend" | "reactivate"
  ) => {
    if (user.is_admin) {
      setError("Un compte administrateur ne peut pas être modifié ici.");
      return;
    }

    const actionLabel =
      action === "suspend" ? "suspendre" : "réactiver";

    if (
      !window.confirm(
        `Confirmer la demande pour ${actionLabel} le compte de ${
          user.username || user.email || user.id
        } ?`
      )
    ) {
      return;
    }

    const reason = window.prompt(
      "Indique le motif administratif de cette opération :"
    );

    if (reason === null) return;

    if (reason.trim().length < 5) {
      setError("Le motif doit contenir au moins 5 caractères.");
      return;
    }

    setProcessingId(user.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          action,
          reason: reason.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Impossible de modifier ce compte."
        );
      }

      setMessage(result.message || "Opération effectuée.");
      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const buyers = users.filter(
    (user) => user.role === "acheteur"
  ).length;

  const sellers = users.filter(
    (user) => user.role === "vendeur"
  ).length;

  const suspended = users.filter(
    (user) => user.is_suspended
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
              Gestion des utilisateurs
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Consulte les comptes et contrôle leur accès à Moshi.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadUsers()}
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
            title="Comptes trouvés"
            value={total}
            icon={<Users size={22} />}
          />

          <StatCard
            title="Acheteurs sur cette page"
            value={buyers}
            icon={<UserRound size={22} />}
          />

          <StatCard
            title="Vendeurs sur cette page"
            value={sellers}
            icon={<Store size={22} />}
          />

          <StatCard
            title="Suspendus sur cette page"
            value={suspended}
            icon={<ShieldBan size={22} />}
          />
        </section>

        {message && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-300">
            <CheckCircle2 size={19} />
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            <AlertCircle size={19} />
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
                onChange={(event) =>
                  changeSearch(event.target.value)
                }
                placeholder="Rechercher par nom, pseudo, e-mail ou téléphone..."
                className="h-12 w-full rounded-xl border border-white/10 bg-[#080b12] pl-12 pr-4 text-sm text-white outline-none placeholder:text-gray-600 focus:border-purple-400"
              />
            </div>

            <select
              value={role}
              onChange={(event) => changeFilter(event.target.value)}
              className="h-12 rounded-xl border border-white/10 bg-[#080b12] px-4 text-sm text-white outline-none focus:border-purple-400"
            >
              <option value="all">Tous les comptes</option>
              <option value="acheteur">Acheteurs</option>
              <option value="vendeur">Vendeurs</option>
            </select>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-[#111722] py-20 text-center text-gray-400">
            <RefreshCw
              size={25}
              className="mx-auto mb-3 animate-spin"
            />
            Chargement des utilisateurs...
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#111722] px-5 py-16 text-center">
            <Users
              size={38}
              className="mx-auto mb-4 text-gray-500"
            />

            <h2 className="font-semibold">
              Aucun utilisateur trouvé
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              Modifie ta recherche ou tes filtres.
            </p>
          </div>
        ) : (
          <section className="space-y-4">
            {users.map((user) => (
              <article
                key={user.id}
                className="rounded-2xl border border-white/10 bg-[#111722] p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-purple-500/15 text-lg font-bold text-purple-200">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (user.username || user.full_name || "M")
                          .slice(0, 1)
                          .toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-bold">
                          {user.full_name ||
                            user.username ||
                            "Utilisateur Moshi"}
                        </h2>

                        {user.is_verified && (
                          <span
                            title="Compte certifié"
                            aria-label="Compte certifié"
                            className="inline-flex items-center"
                          >
                            <BadgeCheck
                              size={17}
                              className="text-blue-400"
                              aria-hidden="true"
                            />
                          </span>
                        )}

                        {user.is_admin && (
                          <span className="rounded-full bg-purple-500/15 px-2 py-1 text-[10px] font-bold text-purple-300">
                            ADMIN
                          </span>
                        )}
                      </div>

                      <p className="mt-1 truncate text-xs text-gray-400">
                        @{user.username || "sans-pseudo"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge suspended={user.is_suspended} />

                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300">
                      {user.role === "vendeur"
                        ? "Vendeur"
                        : user.role === "acheteur"
                        ? "Acheteur"
                        : user.role}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                  <InfoItem
                    icon={<Mail size={15} />}
                    label="E-mail"
                    value={user.email || "Non renseigné"}
                  />

                  <InfoItem
                    icon={<MapPin size={15} />}
                    label="Pays"
                    value={user.country || "Non renseigné"}
                  />

                  <InfoItem
                    icon={<CalendarDays size={15} />}
                    label="Inscription"
                    value={formatDate(user.created_at)}
                  />

                  <InfoItem
                    icon={<UserRound size={15} />}
                    label="Dernière connexion"
                    value={formatDate(user.last_sign_in_at)}
                  />
                </div>

                {user.role === "vendeur" && user.seller_status && (
                  <p className="mt-3 text-xs text-gray-500">
                    Statut vendeur : {user.seller_status}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <p className="max-w-xl break-all text-[10px] text-gray-600">
                    ID : {user.id}
                  </p>

                  {user.is_admin ? (
                    <span className="text-xs text-purple-300">
                      Compte administrateur protégé
                    </span>
                  ) : user.is_suspended ? (
                    <button
                      type="button"
                      onClick={() =>
                        void changeStatus(user, "reactivate")
                      }
                      disabled={processingId === user.id}
                      className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-xs font-bold text-green-300 transition hover:bg-green-500/20 disabled:opacity-50"
                    >
                      <ShieldCheckIcon size={16} />

                      {processingId === user.id
                        ? "Traitement..."
                        : "Réactiver le compte"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        void changeStatus(user, "suspend")
                      }
                      disabled={processingId === user.id}
                      className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                    >
                      <ShieldBan size={16} />

                      {processingId === user.id
                        ? "Traitement..."
                        : "Suspendre le compte"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#111722] p-4">
          <p className="text-xs text-gray-400">
            Page {page} sur {totalPages} · {total} compte(s)
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
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

        <section className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5">
          <div className="flex items-start gap-3">
            <ShieldBan
              size={21}
              className="mt-0.5 shrink-0 text-amber-300"
            />

            <div>
              <h3 className="font-semibold text-amber-200">
                À connaître sur les suspensions
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-400">
                La suspension Auth bloque les nouvelles connexions et
                le renouvellement des sessions. Elle ne révoque pas
                instantanément tous les jetons d'accès déjà émis.
                Les API sensibles de Moshi devront aussi vérifier
                le statut du compte pour bloquer immédiatement les
                opérations protégées.
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
  icon: ReactNode;
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

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-gray-500">
        {icon}
        {label}
      </div>

      <p className="truncate text-xs text-gray-300">{value}</p>
    </div>
  );
}

function StatusBadge({
  suspended,
}: {
  suspended: boolean;
}) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        suspended
          ? "bg-red-500/10 text-red-300"
          : "bg-emerald-500/10 text-emerald-300"
      }`}
    >
      {suspended ? "Suspendu" : "Actif"}
    </span>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Jamais / indisponible";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Indisponible";

  return date.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

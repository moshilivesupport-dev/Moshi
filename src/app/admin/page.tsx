
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  ClipboardList,
  Coins,
  CreditCard,
  CircleDollarSign,
  Gavel,
  LayoutDashboard,
  Megaphone,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type AdminModule = {
  title: string;
  description: string;
  href?: string;
  icon: LucideIcon;
  status: "active" | "coming";
};

const modules: AdminModule[] = [
  {
    title: "Utilisateurs",
    description: "Comptes, vendeurs, créateurs et suspensions.",
    href: "/admin/users",
    icon: Users,
    status: "active",
  },
  {
    title: "Certifications",
    description: "Examiner et traiter les demandes de certification.",
    href: "/admin/verifications",
    icon: BadgeCheck,
    status: "active",
  },
  {
    title: "Coins Moshi",
    description: "Packs, tarifs, achats et opérations de coins.",
    icon: Coins,
    status: "coming",
  },
  {
    title: "Abonnements",
    description: "Tarifs, durées et renouvellements.",
    icon: CreditCard,
    status: "coming",
  },
  {
    title: "Paiements",
    description: "CinetPay, paiements crypto et remboursements.",
    icon: CircleDollarSign,
    status: "coming",
  },
  {
    title: "Boutiques",
    description: "Vendeurs, produits et gestion des boutiques.",
    icon: ShoppingBag,
    status: "coming",
  },
  {
    title: "Commandes",
    description: "Commandes, paiements et suivi des ventes.",
    icon: Package,
    status: "coming",
  },
  {
    title: "Livraisons",
    description: "Expéditions, transporteurs et réceptions.",
    icon: Truck,
    status: "coming",
  },
  {
    title: "Litiges",
    description: "Réclamations, décisions et remboursements.",
    icon: Gavel,
    status: "coming",
  },
  {
    title: "Portefeuilles vendeurs",
    description: "Contrôle, mouvements et audit des opérations.",
    icon: Wallet,
    status: "coming",
  },
  {
    title: "Promotions",
    description: "Publicités, produits sponsorisés et campagnes.",
    icon: Megaphone,
    status: "coming",
  },
  {
    title: "Statistiques",
    description: "Revenus Moshi, ventes et activité globale.",
    icon: BarChart3,
    status: "coming",
  },
  {
    title: "Activités",
    description: "Historique des actions et journal administratif.",
    icon: Activity,
    status: "coming",
  },
  {
    title: "Paramètres",
    description: "Configuration générale de la plateforme.",
    icon: Settings,
    status: "coming",
  },
];

const activeShortcuts = [
  {
    title: "Gestion des utilisateurs",
    description: "Consulter les comptes, gérer les statuts et les suspensions.",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Demandes de certification",
    description: "Examiner les dossiers des utilisateurs.",
    href: "/admin/verifications",
    icon: ShieldCheck,
  },
  {
    title: "Changements de pays",
    description: "Examiner les demandes de changement de pays.",
    href: "/admin/country-change",
    icon: ClipboardList,
  },
];

export default async function AdminHomePage() {
  const auth = await requireAdmin();

  if (!auth.ok) {
    redirect(auth.status === 401 ? "/auth/login" : "/");
  }

  const activeCount = modules.filter(
    (module) => module.status === "active" && Boolean(module.href)
  ).length;

  const comingCount = modules.filter(
    (module) => module.status === "coming"
  ).length;

  return (
    <main className="min-h-screen bg-[#080b12] text-white">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="moshi-gradient flex h-12 w-12 items-center justify-center rounded-2xl">
              <LayoutDashboard size={25} className="text-white" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-purple-300">
                MOSHI
              </p>
              <h1 className="text-xl font-bold sm:text-2xl">
                Administration centrale
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 sm:block">
              Accès administrateur sécurisé
            </div>

            <Link
              href="/"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-gray-300 transition hover:bg-white/10"
            >
              Retour à Moshi
            </Link>
          </div>
        </header>

        {/* WELCOME */}
        <section className="mt-8">
          <p className="text-sm text-gray-400">
            Centre de contrôle de la plateforme
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Bonjour, administrateur.
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
            Depuis cet espace, tu pourras superviser les utilisateurs,
            les revenus de Moshi, les paiements, les boutiques et
            l&apos;ensemble des activités de la plateforme.
          </p>
        </section>

        {/* STATUS CARDS */}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#111722] p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                Modules disponibles
              </span>
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                <ShieldCheck size={21} />
              </div>
            </div>

            <p className="mt-4 text-3xl font-bold tabular-nums">
              {activeCount}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Sections reliées à leurs interfaces.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111722] p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                Modules à développer
              </span>
              <div className="rounded-xl bg-purple-500/10 p-3 text-purple-300">
                <ClipboardList size={21} />
              </div>
            </div>

            <p className="mt-4 text-3xl font-bold tabular-nums">
              {comingCount}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Sections prévues dans l&apos;administration centrale.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111722] p-5 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                Sécurité
              </span>
              <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
                <ShieldCheck size={21} />
              </div>
            </div>

            <p className="mt-4 text-lg font-bold">
              Contrôle des accès actif
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Vérification des droits via admin_users côté serveur.
            </p>
          </div>
        </section>

        {/* QUICK ACCESS */}
        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-xl font-bold">
              Accès rapides
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Les interfaces administratives actuellement disponibles.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activeShortcuts.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#111722] p-5 transition hover:border-purple-400/50 hover:bg-[#151d2b]"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-purple-500/10 p-3 text-purple-300">
                      <Icon size={23} />
                    </div>

                    <div>
                      <h3 className="font-semibold">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-xs text-gray-400">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <ArrowUpRight
                    size={20}
                    className="shrink-0 text-gray-500 transition group-hover:text-purple-300"
                  />
                </Link>
              );
            })}
          </div>
        </section>

        {/* MODULES */}
        <section className="mt-11">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">
                Tous les modules
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                Organisation générale de l&apos;administration Moshi.
              </p>
            </div>

            <span className="text-xs text-gray-500">
              {modules.length} modules prévus
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => {
              const Icon = module.icon;
              const isActive =
                module.status === "active" && Boolean(module.href);

              const content = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-xl bg-white/[0.06] p-3 text-purple-300">
                      <Icon size={23} />
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                        isActive
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-white/5 text-gray-400"
                      }`}
                    >
                      {isActive ? "DISPONIBLE" : "EN PRÉPARATION"}
                    </span>
                  </div>

                  <h3 className="mt-5 font-bold">
                    {module.title}
                  </h3>

                  <p className="mt-2 min-h-10 text-xs leading-5 text-gray-400">
                    {module.description}
                  </p>

                  <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                    <span
                      className={`text-xs font-semibold ${
                        isActive ? "text-purple-300" : "text-gray-500"
                      }`}
                    >
                      {isActive
                        ? "Ouvrir le module"
                        : "Développement à venir"}
                    </span>

                    {isActive ? (
                      <ArrowUpRight
                        size={17}
                        className="text-purple-300"
                      />
                    ) : (
                      <span className="text-xs text-gray-600">—</span>
                    )}
                  </div>
                </>
              );

              if (isActive && module.href) {
                return (
                  <Link
                    key={module.title}
                    href={module.href}
                    className="rounded-2xl border border-white/10 bg-[#111722] p-5 transition hover:-translate-y-0.5 hover:border-purple-400/40 hover:bg-[#151d2b]"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <div
                  key={module.title}
                  aria-disabled="true"
                  className="rounded-2xl border border-white/[0.07] bg-[#0e141e] p-5 opacity-80"
                >
                  {content}
                </div>
              );
            })}
          </div>
        </section>

        {/* SECURITY NOTICE */}
        <section className="mt-10 rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck
              size={22}
              className="mt-0.5 shrink-0 text-blue-300"
            />

            <div>
              <h3 className="font-semibold text-blue-200">
                Sécurité financière Moshi
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-400">
                Les paiements, remboursements et crédits de coins devront
                être validés côté serveur. Les opérations administratives
                sensibles devront être journalisées. Les portefeuilles
                personnels des vendeurs resteront séparés des revenus
                propres de Moshi.
              </p>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-10 border-t border-white/10 py-6 text-center text-xs text-gray-600">
          Moshi Administration · Espace réservé aux administrateurs autorisés
        </footer>
      </div>
    </main>
  );
}

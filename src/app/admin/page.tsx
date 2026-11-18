import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const auth = await requireAdmin();

  if (!auth.ok) {
    redirect(auth.status === 401 ? "/auth/login" : "/");
  }

  const sections = [
    {
      title: "Changements de pays",
      description:
        "Consulter, examiner, approuver ou refuser les demandes de changement de pays.",
      href: "/admin/country-change",
      icon: "🌍",
    },
    {
      title: "Vérifications",
      description:
        "Consulter les demandes de vérification des utilisateurs.",
      href: "/admin/verifications",
      icon: "🛡️",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
          MOSHI ADMIN
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Tableau de bord
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Gestion et administration de la plateforme Moshi.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-cyan-500 hover:bg-slate-800"
            >
              <div className="text-3xl">{section.icon}</div>

              <h2 className="mt-4 text-lg font-bold">
                {section.title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                {section.description}
              </p>

              <p className="mt-5 text-sm font-semibold text-cyan-400">
                Ouvrir la section →
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
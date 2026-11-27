import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Coins } from "lucide-react";
import { requireAdmin } from "@/lib/supabase/admin";
import CoinsManager from "./CoinsManager";

export const dynamic = "force-dynamic";

export default async function AdminCoinsPage() {
  const auth = await requireAdmin();

  if (!auth.ok) {
    redirect(auth.status === 401 ? "/auth/login" : "/");
  }

  return (
    <main className="min-h-screen bg-[#080b12] px-4 py-7 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-purple-500/15 p-3 text-purple-300">
              <Coins size={28} />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-purple-300">
                MOSHI ADMINISTRATION
              </p>
              <h1 className="text-2xl font-bold">Coins Moshi</h1>
              <p className="mt-1 text-sm text-gray-400">
                Configuration des packs et des tarifs.
              </p>
            </div>
          </div>

          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/10"
          >
            <ArrowLeft size={17} />
            Administration
          </Link>
        </header>

        <CoinsManager />
      </div>
    </main>
  );
}
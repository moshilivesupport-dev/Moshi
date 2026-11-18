
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  UserRound,
  ShieldCheck,
  Wallet,
  LogOut,
  Settings,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    const confirmed = window.confirm(
      "Voulez-vous vraiment vous déconnecter de Moshi ?"
    );

    if (!confirmed) return;

    setLoggingOut(true);
    setError("");

    try {
      const { error: logoutError } = await supabase.auth.signOut();

      if (logoutError) throw logoutError;

      router.replace("/login");
      router.refresh();
    } catch (err) {
      console.error("Erreur de déconnexion :", err);
      setError("Impossible de vous déconnecter. Réessayez.");
      setLoggingOut(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-gray-50 pb-10">
      {/* EN-TÊTE */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-4">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5 text-gray-800" />
        </button>

        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-purple-600" />
          <h1 className="text-lg font-bold text-gray-900">
            Paramètres
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
        {/* COMPTE */}
        <section>
          <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-gray-400">
            Mon compte
          </h2>

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <Link
              href="/profile/edit"
              className="flex items-center gap-3 p-4 transition hover:bg-gray-50"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <UserRound className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">
                  Modifier mon profil
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Photo, nom, identifiant et biographie
                </p>
              </div>

              <ChevronRight className="h-5 w-5 text-gray-400" />
            </Link>

            <div className="mx-4 border-t border-gray-100" />

            <Link
              href="/verification/request"
              className="flex items-center gap-3 p-4 transition hover:bg-gray-50"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">
                  Certification du compte
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Demander ou suivre la certification
                </p>
              </div>

              <ChevronRight className="h-5 w-5 text-gray-400" />
            </Link>
          </div>
        </section>

        {/* PORTEFEUILLE */}
        <section>
          <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-gray-400">
            Finances
          </h2>

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <Link
              href="/wallet"
              className="flex items-center gap-3 p-4 transition hover:bg-gray-50"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
                <Wallet className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">
                  Mon portefeuille
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Consulter mon portefeuille Moshi
                </p>
              </div>

              <ChevronRight className="h-5 w-5 text-gray-400" />
            </Link>
          </div>
        </section>

        {/* SESSION */}
        <section>
          <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-gray-400">
            Session
          </h2>

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-red-50 disabled:opacity-60"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                {loggingOut ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <LogOut className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-red-600">
                  {loggingOut ? "Déconnexion..." : "Se déconnecter"}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Fermer ta session Moshi sur cet appareil
                </p>
              </div>

              {!loggingOut && (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
        </section>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        <p className="pt-4 text-center text-xs text-gray-400">
          Moshi · Paramètres de ton compte
        </p>
      </div>
    </main>
  );
}

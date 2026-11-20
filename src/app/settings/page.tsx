
"use client";

import { useEffect, useState } from "react";
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
  MessageCircle,
  Bell,
  Languages,
  Check,
  Coins,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const LANGUAGES = [
  { value: "fr", label: "Français 🇫🇷" },
  { value: "en", label: "English 🇬🇧" },
  { value: "pt", label: "Português 🇵🇹" },
  { value: "es", label: "Español 🇪🇸" },
  { value: "ar", label: "العربية 🇸🇦" },
] as const;

const CURRENCIES = [
  { value: "XOF", label: "XOF — Franc CFA (BCEAO)" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "USD", label: "USD — Dollar américain" },
  { value: "GBP", label: "GBP — Livre sterling" },
  { value: "GHS", label: "GHS — Cedi ghanéen" },
] as const;

type Language = (typeof LANGUAGES)[number]["value"];
type Currency = (typeof CURRENCIES)[number]["value"];

export default function SettingsPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [loggingOut, setLoggingOut] = useState(false);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);

  const [language, setLanguage] = useState<Language>("fr");
  const [currency, setCurrency] = useState<Currency>("XOF");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          router.replace("/auth/login");
          return;
        }

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("preferred_language, preferred_currency")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!active) return;

        const savedLanguage = LANGUAGES.find(
          (item) => item.value === data?.preferred_language
        );

        const savedCurrency = CURRENCIES.find(
          (item) => item.value === data?.preferred_currency
        );

        setLanguage(savedLanguage?.value ?? "fr");
        setCurrency(savedCurrency?.value ?? "XOF");
      } catch (err) {
        console.error("Erreur de chargement des préférences :", err);

        if (active) {
          setError("Impossible de charger les préférences du compte.");
        }
      } finally {
        if (active) setLoadingPreferences(false);
      }
    }

    void loadPreferences();

    return () => {
      active = false;
    };
  }, [supabase, router]);

  async function savePreferences(
    nextLanguage: Language,
    nextCurrency: Currency
  ) {
    if (savingPreferences) return;

    if (nextLanguage === language && nextCurrency === currency) return;

    setSavingPreferences(true);
    setError("");
    setSuccess("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Session expirée. Reconnecte-toi.");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          preferred_language: nextLanguage,
          preferred_currency: nextCurrency,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setLanguage(nextLanguage);
      setCurrency(nextCurrency);
      setSuccess("Tes préférences ont été enregistrées.");
    } catch (err) {
      console.error("Erreur de sauvegarde des préférences :", err);

      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'enregistrer ces préférences."
      );
    } finally {
      setSavingPreferences(false);
    }
  }

  async function handleLogout() {
    const confirmed = window.confirm(
      "Voulez-vous vraiment vous déconnecter de Moshi ?"
    );

    if (!confirmed) return;

    setLoggingOut(true);
    setError("");
    setSuccess("");

    try {
      const { error: logoutError } = await supabase.auth.signOut();

      if (logoutError) throw logoutError;

      router.replace("/auth/login");
      router.refresh();
    } catch (err) {
      console.error("Erreur de déconnexion :", err);
      setError("Impossible de vous déconnecter. Réessaie.");
      setLoggingOut(false);
    }
  }

  const sections = [
    {
      title: "Notifications",
      items: [
        {
          href: "/notifications",
          title: "Mes notifications",
          description: "Consulter les nouveautés et les alertes",
          icon: Bell,
          iconStyle: "bg-amber-50 text-amber-600",
        },
      ],
    },
    {
      title: "Assistance",
      items: [
        {
          href: "/support/report-problem",
          title: "Signaler un problème",
          description: "Contacter l’équipe Moshi et suivre tes demandes",
          icon: MessageCircle,
          iconStyle: "bg-orange-50 text-orange-600",
        },
      ],
    },
    {
      title: "Finances",
      items: [
        {
          href: "/wallet",
          title: "Mon portefeuille",
          description: "Consulter mon portefeuille Moshi",
          icon: Wallet,
          iconStyle: "bg-pink-50 text-pink-600",
        },
      ],
    },
  ];

  return (
    <main className="min-h-[100dvh] bg-moshi-bg pb-12">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-100 bg-white/95 px-4 py-4 shadow-sm backdrop-blur">
        <button
          type="button"
          onClick={() => router.push("/profile/me")}
          aria-label="Retour au profil"
          className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5 text-gray-800" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-moshi-purple">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Paramètres</h1>
            <p className="text-xs text-gray-500">Gère ton compte Moshi</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
        {error && (
          <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">
            <Check className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <section>
          <div className="mb-3 flex items-center gap-2 px-1">
            <UserRound className="h-4 w-4 text-moshi-purple" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Mon compte
            </h2>
          </div>

          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
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
                  Photo, nom, identifiant, biographie et réseaux sociaux
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

        <section>
          <div className="mb-3 flex items-center gap-2 px-1">
            <Sparkles className="h-4 w-4 text-moshi-purple" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Préférences
            </h2>
          </div>

          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center gap-3 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Languages className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">Langue</p>
                <p className="mt-1 text-xs text-gray-500">
                  Langue préférée de ton compte
                </p>
              </div>

              {loadingPreferences ? (
                <Loader2 className="h-5 w-5 animate-spin text-moshi-purple" />
              ) : (
                <select
                  aria-label="Choisir la langue"
                  value={language}
                  disabled={savingPreferences}
                  onChange={(event) =>
                    void savePreferences(
                      event.target.value as Language,
                      currency
                    )
                  }
                  className="max-w-[145px] rounded-xl border border-gray-200 bg-white px-2 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-moshi-purple disabled:opacity-50"
                >
                  {LANGUAGES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="mx-4 border-t border-gray-100" />

            <div className="flex items-center gap-3 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Coins className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">Devise</p>
                <p className="mt-1 text-xs text-gray-500">
                  Devise préférée de ton compte
                </p>
              </div>

              {loadingPreferences ? (
                <Loader2 className="h-5 w-5 animate-spin text-moshi-purple" />
              ) : (
                <select
                  aria-label="Choisir la devise"
                  value={currency}
                  disabled={savingPreferences}
                  onChange={(event) =>
                    void savePreferences(
                      language,
                      event.target.value as Currency
                    )
                  }
                  className="max-w-[165px] rounded-xl border border-gray-200 bg-white px-2 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-moshi-purple disabled:opacity-50"
                >
                  {CURRENCIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {savingPreferences && (
              <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin text-moshi-purple" />
                Enregistrement des préférences...
              </div>
            )}
          </div>

          <p className="mt-2 px-1 text-xs text-gray-400">
            Tes choix sont enregistrés dans ton profil Moshi.
          </p>
        </section>

        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-gray-500">
              {section.title}
            </h2>

            <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
              {section.items.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 p-4 transition hover:bg-gray-50"
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.iconStyle}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {item.description}
                      </p>
                    </div>

                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        <section>
          <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-wider text-gray-500">
            Session
          </h2>

          <div className="overflow-hidden rounded-3xl border border-red-100 bg-white shadow-sm">
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

        <p className="pt-3 text-center text-xs text-gray-400">
          Moshi · Paramètres de ton compte
        </p>
      </div>
    </main>
  );
}

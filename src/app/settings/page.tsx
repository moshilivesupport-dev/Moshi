
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
  Store,
  Palette,
  Globe,
  Lock,
  Download,
  Headphones,
  Video,
  Smartphone,
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
  { value: "XOF", label: "XOF — Franc CFA" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "USD", label: "USD — Dollar américain" },
  { value: "GBP", label: "GBP — Livre sterling" },
  { value: "GHS", label: "GHS — Cedi ghanéen" },
] as const;

type Language = (typeof LANGUAGES)[number]["value"];
type Currency = (typeof CURRENCIES)[number]["value"];

type SettingItem = {
  title: string;
  description?: string;
  href?: string;
  icon: typeof UserRound;
  iconStyle: string;
  value?: string;
  disabled?: boolean;
};

function SettingLink({ item }: { item: SettingItem }) {
  const Icon = item.icon;

  const content = (
    <>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconStyle}`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900">
          {item.title}
        </p>
        {item.description && (
          <p className="mt-0.5 text-xs text-gray-500">
            {item.description}
          </p>
        )}
      </div>

      {item.value && (
        <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-moshi-purple">
          {item.value}
        </span>
      )}

      {item.href && (
        <ChevronRight className="h-5 w-5 shrink-0 text-moshi-purple" />
      )}

      {item.disabled && (
        <span className="text-[10px] font-semibold text-gray-400">
          Bientôt
        </span>
      )}
    </>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        className="flex min-h-[62px] items-center gap-3 px-4 py-3 transition hover:bg-purple-50/40"
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      aria-disabled="true"
      className="flex min-h-[62px] items-center gap-3 px-4 py-3 opacity-70"
    >
      {content}
    </div>
  );
}

function SettingSection({
  title,
  items,
}: {
  title: string;
  items: SettingItem[];
}) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-sm font-bold text-gray-900">
        {title}
      </h2>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-100">
        {items.map((item) => (
          <SettingLink key={item.title} item={item} />
        ))}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [userId, setUserId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [language, setLanguage] = useState<Language>("fr");
  const [currency, setCurrency] = useState<Currency>("XOF");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
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

        if (!active) return;
        setUserId(user.id);

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("preferred_language,preferred_currency")
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
        console.error("Chargement paramètres :", err);

        if (active) {
          setError("Impossible de charger les paramètres du compte.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSettings();

    return () => {
      active = false;
    };
  }, [supabase, router]);

  async function savePreferences(
    nextLanguage: Language,
    nextCurrency: Currency
  ) {
    if (saving || !userId) return;

    if (
      nextLanguage === language &&
      nextCurrency === currency
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          preferred_language: nextLanguage,
          preferred_currency: nextCurrency,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) throw updateError;

      setLanguage(nextLanguage);
      setCurrency(nextCurrency);
      setSuccess("Préférences enregistrées.");
    } catch (err) {
      console.error("Sauvegarde préférences :", err);
      setError(
        err instanceof Error
          ? err.message
          : "Impossible d'enregistrer les préférences."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    if (
      !window.confirm(
        "Veux-tu vraiment te déconnecter de Moshi ?"
      )
    ) {
      return;
    }

    setLoggingOut(true);
    setError("");

    try {
      const { error: logoutError } =
        await supabase.auth.signOut();

      if (logoutError) throw logoutError;

      router.replace("/auth/login");
      router.refresh();
    } catch (err) {
      console.error("Déconnexion :", err);
      setError("Impossible de te déconnecter. Réessaie.");
      setLoggingOut(false);
    }
  }

  function goBack() {
    if (userId) {
      router.push(`/profile/${userId}`);
    } else {
      router.push("/");
    }
  }

  return (
    <main className="min-h-[100dvh] bg-moshi-bg pb-10">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-purple-100 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="Retour au profil"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50"
          >
            <ArrowLeft className="h-5 w-5 text-gray-800" />
          </button>

          <div>
            <h1 className="text-lg font-extrabold text-gray-900">
              Paramètres
            </h1>
            <p className="text-[11px] text-gray-500">
              Personnalise ton expérience Moshi
            </p>
          </div>
        </div>

        <Settings className="h-6 w-6 text-moshi-purple" />
      </header>

      <div className="mx-auto max-w-xl space-y-5 px-4 py-5">
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 p-3 text-sm text-green-700">
            <Check className="h-5 w-5 shrink-0" />
            {success}
          </div>
        )}

        <SettingSection
          title="Compte"
          items={[
            {
              title: "Informations du compte",
              description: "Identité et informations de connexion",
              href: "/profile",
              icon: UserRound,
              iconStyle: "bg-indigo-50 text-indigo-600",
            },
            {
              title: "Sécurité",
              description: "Protection et sécurité du compte",
              icon: ShieldCheck,
              iconStyle: "bg-blue-50 text-blue-600",
              disabled: true,
            },
            {
              title: "Portefeuille",
              description: "Solde, transactions et retraits",
              href: "/wallet",
              icon: Wallet,
              iconStyle: "bg-purple-50 text-moshi-purple",
            },
            {
              title: "Certification du compte",
              description: "Demander la certification Moshi",
              href: "/verification/request",
              icon: ShieldCheck,
              iconStyle: "bg-purple-100 text-purple-700",
            },
            {
              title: "Statut vendeur",
              description: "Gérer ton espace vendeur",
              href: "/seller",
              icon: Store,
              iconStyle: "bg-pink-50 text-pink-600",
            },
          ]}
        />

        <section>
          <h2 className="mb-2 px-1 text-sm font-bold text-gray-900">
            Préférences
          </h2>

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-100">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Bell className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  Notifications
                </p>
                <p className="text-xs text-gray-500">
                  Alertes et actualités
                </p>
              </div>

              <Link
                href="/notifications"
                aria-label="Ouvrir les notifications"
              >
                <ChevronRight className="h-5 w-5 text-moshi-purple" />
              </Link>
            </div>

            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-moshi-purple">
                <Palette className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  Apparence
                </p>
                <p className="text-xs text-gray-500">
                  Personnalisation de l'affichage
                </p>
              </div>
              <span className="text-[10px] font-semibold text-gray-400">
                Bientôt
              </span>
            </div>

            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Languages className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  Langue
                </p>
                <p className="text-xs text-gray-500">
                  Langue préférée
                </p>
              </div>

              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-moshi-purple" />
              ) : (
                <select
                  aria-label="Choisir la langue"
                  value={language}
                  disabled={saving}
                  onChange={(event) =>
                    void savePreferences(
                      event.target.value as Language,
                      currency
                    )
                  }
                  className="max-w-[125px] rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-moshi-purple"
                >
                  {LANGUAGES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Coins className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  Devise
                </p>
                <p className="text-xs text-gray-500">
                  Devise préférée
                </p>
              </div>

              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-moshi-purple" />
              ) : (
                <select
                  aria-label="Choisir la devise"
                  value={currency}
                  disabled={saving}
                  onChange={(event) =>
                    void savePreferences(
                      language,
                      event.target.value as Currency
                    )
                  }
                  className="max-w-[145px] rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-moshi-purple"
                >
                  {CURRENCIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-3 px-4 py-3 opacity-70">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <Video className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  Qualité vidéo
                </p>
                <p className="text-xs text-gray-500">
                  Qualité de lecture et consommation de données
                </p>
              </div>
              <span className="text-[10px] font-semibold text-gray-400">
                Bientôt
              </span>
            </div>
          </div>

          {saving && (
            <p className="mt-2 flex items-center gap-2 px-1 text-xs text-gray-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Enregistrement...
            </p>
          )}
        </section>

        <SettingSection
          title="Confidentialité"
          items={[
            {
              title: "Confidentialité",
              description: "Contrôle de la visibilité de ton compte",
              icon: Lock,
              iconStyle: "bg-indigo-50 text-indigo-600",
              disabled: true,
            },
            {
              title: "Utilisateurs bloqués",
              description: "Gérer les comptes bloqués",
              icon: UserRound,
              iconStyle: "bg-red-50 text-red-500",
              disabled: true,
            },
            {
              title: "Télécharger mes données",
              description: "Obtenir une copie de tes informations",
              icon: Download,
              iconStyle: "bg-gray-100 text-gray-600",
              disabled: true,
            },
          ]}
        />

        <SettingSection
          title="Assistance"
          items={[
            {
              title: "Centre d'aide et contact",
              description: "Contacter l'équipe Moshi",
              href: "/support/report-problem",
              icon: Headphones,
              iconStyle: "bg-orange-50 text-orange-600",
            },
            {
              title: "Signaler un problème",
              description: "Envoyer un signalement",
              href: "/support/report-problem",
              icon: MessageCircle,
              iconStyle: "bg-pink-50 text-pink-600",
            },
          ]}
        />

        <section>
          <h2 className="mb-2 px-1 text-sm font-bold text-gray-900">
            Session
          </h2>

          <div className="overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-red-50 disabled:opacity-60"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                {loggingOut ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <LogOut className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-red-600">
                  {loggingOut ? "Déconnexion..." : "Se déconnecter"}
                </p>
                <p className="text-xs text-gray-500">
                  Fermer ta session sur cet appareil
                </p>
              </div>

              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </section>

        <div className="py-3 text-center">
          <p className="text-xs font-semibold text-gray-400">
            Moshi
          </p>
          <p className="mt-1 text-[10px] text-gray-400">
            Paramètres de ton compte
          </p>
        </div>
      </div>
    </main>
  );
}

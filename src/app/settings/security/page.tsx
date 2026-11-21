
"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ShieldCheck, LockKeyhole, Eye, EyeOff, Loader2,
  AlertCircle, CheckCircle2, MonitorSmartphone, LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SecuritySettingsPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [endingOtherSessions, setEndingOtherSessions] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      const { data, error: authError } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !data.user) {
        router.replace("/auth/login");
        return;
      }

      setEmail(data.user.email ?? "");
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSaving(true);

    try {
      const { error: updateError } =
        await supabase.auth.updateUser({ password });

      if (updateError) throw updateError;

      setPassword("");
      setConfirmPassword("");
      setSuccess("Mot de passe modifié avec succès.");
    } catch (err) {
      console.error("Modification du mot de passe :", err);
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de modifier le mot de passe."
      );
    } finally {
      setSaving(false);
    }
  }

  async function endOtherSessions() {
    if (
      !window.confirm(
        "Déconnecter Moshi de tous tes autres appareils ? Cet appareil restera connecté."
      )
    ) {
      return;
    }

    setEndingOtherSessions(true);
    setError("");
    setSuccess("");

    try {
      const { error: signOutError } =
        await supabase.auth.signOut({ scope: "others" });

      if (signOutError) throw signOutError;

      setSuccess(
        "Les autres sessions ont été déconnectées. Les jetons déjà émis peuvent rester valides jusqu'à leur expiration."
      );
    } catch (err) {
      console.error("Déconnexion des autres sessions :", err);
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de fermer les autres sessions."
      );
    } finally {
      setEndingOtherSessions(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-moshi-bg pb-10">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-purple-100 bg-white/95 px-4 py-3 backdrop-blur">
        <Link
          href="/settings"
          aria-label="Retour aux paramètres"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50"
        >
          <ArrowLeft className="h-5 w-5 text-gray-800" />
        </Link>

        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold text-gray-900">
            Sécurité
          </h1>
          <p className="text-[11px] text-gray-500">
            Protège ton compte Moshi
          </p>
        </div>

        <ShieldCheck className="h-6 w-6 text-moshi-purple" />
      </header>

      <div className="mx-auto max-w-xl space-y-5 px-4 py-5">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-xl border border-green-100 bg-green-50 p-3 text-sm text-green-700"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {success}
          </div>
        )}

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <LockKeyhole className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-bold text-gray-900">
                Changer le mot de passe
              </h2>
              <p className="text-xs text-gray-500">
                Choisis un mot de passe fort et unique
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-moshi-purple" />
            </div>
          ) : (
            <form onSubmit={changePassword} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Adresse e-mail du compte
                </label>
                <input
                  value={email}
                  readOnly
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-500"
                />
              </div>

              <div>
                <label
                  htmlFor="new-password"
                  className="mb-1.5 block text-sm font-semibold text-gray-700"
                >
                  Nouveau mot de passe
                </label>

                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8 caractères minimum"
                    className="w-full rounded-xl border border-gray-200 px-3 py-3 pr-12 text-sm outline-none focus:border-moshi-purple"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-1.5 block text-sm font-semibold text-gray-700"
                >
                  Confirmer le mot de passe
                </label>

                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Répète le nouveau mot de passe"
                    className="w-full rounded-xl border border-gray-200 px-3 py-3 pr-12 text-sm outline-none focus:border-moshi-purple"
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={
                      showConfirm
                        ? "Masquer la confirmation"
                        : "Afficher la confirmation"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showConfirm ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Utilise au moins 8 caractères. Évite un mot de passe déjà
                utilisé sur un autre service.
              </p>

              <button
                type="submit"
                disabled={saving || loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-moshi-purple px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {saving && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {saving
                  ? "Modification..."
                  : "Enregistrer le nouveau mot de passe"}
              </button>
            </form>
          )}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <MonitorSmartphone className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-bold text-gray-900">
                Sessions actives
              </h2>
              <p className="text-xs text-gray-500">
                Ferme les sessions ouvertes sur tes autres appareils
              </p>
            </div>
          </div>

          <p className="mb-4 text-sm leading-6 text-gray-600">
            Cette action conserve ta session sur cet appareil et déconnecte
            les autres appareils après leur prochaine actualisation de session.
          </p>

          <button
            type="button"
            onClick={endOtherSessions}
            disabled={endingOtherSessions || loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
          >
            {endingOtherSessions ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}

            {endingOtherSessions
              ? "Déconnexion..."
              : "Déconnecter les autres appareils"}
          </button>
        </section>
      </div>
    </main>
  );
}

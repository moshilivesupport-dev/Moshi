"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";
import { newPasswordSchema, NewPasswordForm } from "@/lib/validation/password";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { PasswordStrength } from "@/components/auth/PasswordStrength";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [state, setState] = useState<"loading" | "ready" | "invalid" | "done">("loading");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<NewPasswordForm>({ resolver: zodResolver(newPasswordSchema) });

  const password = watch("password", "");

  // Le lien de l'e-mail passe par /auth/callback, qui ouvre une session temporaire.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setState(data.user ? "ready" : "invalid"));
  }, [supabase]);

  const onSubmit = async (data: NewPasswordForm) => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password: data.password });
    if (error) {
      setError(authErrorMessage(error));
      setLoading(false);
      return;
    }
    // Déconnecte les autres appareils : un ancien mot de passe volé ne sert plus à rien
    await supabase.auth.signOut({ scope: "others" });
    setState("done");
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Nouveau mot de passe</h1>
        </div>

        <div className="card">
          {state === "loading" && <p className="text-center text-muted text-sm py-6">Vérification du lien…</p>}

          {state === "invalid" && (
            <div className="text-center py-4 space-y-4">
              <p className="text-red-400 text-sm">Ce lien est invalide ou a expiré.</p>
              <Link href="/auth/forgot-password">
                <Button variant="outline">Demander un nouveau lien</Button>
              </Link>
            </div>
          )}

          {state === "done" && (
            <div className="text-center py-4 space-y-4">
              <p className="text-green-400 font-medium">Mot de passe modifié ✓</p>
              <p className="text-sm text-muted">Vos autres appareils ont été déconnectés.</p>
              <Link href="/">
                <Button variant="gold">Continuer</Button>
              </Link>
            </div>
          )}

          {state === "ready" && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <PasswordInput
                  label="Nouveau mot de passe"
                  autoComplete="new-password"
                  {...register("password")}
                  error={errors.password?.message}
                />
                <PasswordStrength password={password} />
              </div>
              <PasswordInput
                label="Confirmer le mot de passe"
                autoComplete="new-password"
                {...register("confirm")}
                error={errors.confirm?.message}
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" className="w-full" loading={loading}>
                Enregistrer
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

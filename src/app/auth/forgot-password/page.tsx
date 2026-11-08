"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const schema = z.object({ email: z.string().email("Email invalide") });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }: FormData) => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });
    setLoading(false);

    // On n'indique jamais si l'adresse existe (évite de révéler les comptes).
    // Seule une limite d'envoi est signalée.
    if (error && (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit")) {
      setError(authErrorMessage(error));
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Mot de passe oublié</h1>
          <p className="text-muted text-sm">Nous vous envoyons un lien pour en choisir un nouveau.</p>
        </div>

        <div className="card">
          {sent ? (
            <div className="text-center py-4 space-y-3">
              <p className="text-green-400 font-medium">Vérifiez votre boîte mail</p>
              <p className="text-sm text-muted">
                Si un compte existe pour cette adresse, un e-mail avec un lien de réinitialisation vient d&apos;être envoyé.
                Pensez à vérifier vos courriers indésirables.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input label="Email" type="email" autoComplete="email" {...register("email")} error={errors.email?.message} />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" className="w-full" loading={loading}>
                Envoyer le lien
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-muted mt-6">
          <Link href="/auth/login" className="text-coral hover:underline">Retour à la connexion</Link>
        </p>
      </div>
    </div>
  );
}

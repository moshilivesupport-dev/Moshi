"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { ChevronLeft, MailCheck } from "lucide-react";

const schema = z.object({ current: z.string().min(1, "Saisissez votre mot de passe actuel") });
type FormData = z.infer<typeof schema>;

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  return `${name.slice(0, 2)}${"*".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

export default function ChangePasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user?.email) router.push("/auth/login");
      else setEmail(data.user.email);
    });
  }, [supabase, router]);

  /**
   * 1) on vérifie le mot de passe actuel
   * 2) on envoie un lien de confirmation à l'adresse du compte
   * 3) le nouveau mot de passe se choisit APRÈS le clic sur ce lien (/auth/reset-password)
   */
  const onSubmit = async ({ current }: FormData) => {
    if (!email) return;
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: current });
    if (signInError) {
      setError(signInError.code === "invalid_credentials" ? "Mot de passe actuel incorrect." : authErrorMessage(signInError));
      setLoading(false);
      return;
    }

    const { error: mailError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });
    setLoading(false);
    if (mailError) {
      setError(authErrorMessage(mailError));
      return;
    }
    setSent(true);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-muted hover:text-white mb-4">
        <ChevronLeft className="w-4 h-4" /> Paramètres
      </Link>
      <h1 className="text-2xl font-bold text-white mb-6">Modifier le mot de passe</h1>

      <div className="card">
        {sent ? (
          <div className="text-center py-6 space-y-3">
            <MailCheck className="w-10 h-10 text-green-400 mx-auto" />
            <p className="text-green-400 font-medium">Lien de confirmation envoyé</p>
            <p className="text-sm text-muted">
              Cliquez sur le lien reçu à <span className="text-white">{email ? maskEmail(email) : ""}</span> pour choisir
              votre nouveau mot de passe. Il expire au bout d&apos;un court délai.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <p className="text-sm text-muted">
              Pour votre sécurité, un lien de confirmation sera envoyé à{" "}
              <span className="text-white">{email ? maskEmail(email) : "votre adresse e-mail"}</span>. Vous choisirez le
              nouveau mot de passe depuis ce lien.
            </p>
            <PasswordInput
              label="Mot de passe actuel"
              autoComplete="current-password"
              {...register("current")}
              error={errors.current?.message}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full" loading={loading} disabled={!email}>
              Envoyer le lien de confirmation
            </Button>
            <p className="text-center text-xs text-muted">
              Mot de passe actuel oublié ?{" "}
              <Link href="/auth/forgot-password" className="text-coral hover:underline">Réinitialiser</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

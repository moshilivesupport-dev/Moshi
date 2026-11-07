"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import Link from "next/link";
import { useRouter } from "next/navigation";

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

type FormData = z.infer<typeof schema>;

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    setUnconfirmedEmail(null);

    const { error } = await supabase.auth.signInWithPassword(data);
    if (error) {
      if (error.code === "email_not_confirmed") setUnconfirmedEmail(data.email);
      setError(authErrorMessage(error));
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Email" type="email" autoComplete="email" {...register("email")} error={errors.email?.message} />
      <PasswordInput
        label="Mot de passe"
        autoComplete="current-password"
        {...register("password")}
        error={errors.password?.message}
      />
      <div className="text-right -mt-2">
        <Link href="/auth/forgot-password" className="text-xs text-coral hover:underline">
          Mot de passe oublié ?
        </Link>
      </div>

      {error && (
        <div className="text-sm text-red-400 space-y-1">
          <p>{error}</p>
          {unconfirmedEmail && (
            <Link
              href={`/auth/verify?email=${encodeURIComponent(unconfirmedEmail)}`}
              className="text-coral hover:underline"
            >
              Renvoyer l&apos;e-mail de confirmation
            </Link>
          )}
        </div>
      )}

      <Button type="submit" className="w-full" loading={loading}>
        Se connecter
      </Button>
    </form>
  );
}

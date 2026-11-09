"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { checkPasswordStrength } from "@/lib/password";
import { authErrorMessage } from "@/lib/auth-errors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { PasswordStrength } from "./PasswordStrength";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Store, ShoppingBag } from "lucide-react";

const TERMS_VERSION = "1.0";

const schema = z.object({
  email: z.string().email("Email invalide"),
  username: z.string().min(3, "Minimum 3 caractères").max(30),
  full_name: z.string().min(2, "Nom requis"),
  age: z.coerce.number().min(18, "Vous devez avoir au moins 18 ans"),
  role: z.enum(["buyer", "seller"]),
  password: z.string().refine((val) => checkPasswordStrength(val).isValid, {
    message: "Mot de passe trop faible",
  }),
  terms: z.literal(true, {
    errorMap: () => ({
      message: "Vous devez accepter les CGU et la Politique de confidentialité",
    }),
  }),
});

type FormData = z.infer<typeof schema>;

export function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "buyer" },
  });

  const password = watch("password", "");
  const currentRole = watch("role");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const isSeller = data.role === "seller";

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            username: data.username,
            full_name: data.full_name,
            age: data.age,
            role: data.role,
            seller_status: isSeller ? "approved" : null,
            terms_accepted: true,
            terms_version: TERMS_VERSION,
          },
        },
      });
      if (signUpError) throw signUpError;

      if (
        signUpData.user &&
        signUpData.user.identities &&
        signUpData.user.identities.length === 0
      ) {
        setError(
          "Un compte existe déjà avec cet e-mail. Connectez-vous ou réinitialisez votre mot de passe."
        );
        return;
      }

      // Sécurise le profil même si le trigger n'a pas tout écrit
      if (signUpData.user) {
        await supabase
          .from("profiles")
          .update({
            username: data.username,
            full_name: data.full_name,
            age: data.age,
            role: isSeller ? "seller" : "buyer",
            seller_status: isSeller ? "approved" : null,
            terms_accepted_at: new Date().toISOString(),
            terms_version: TERMS_VERSION,
          })
          .eq("id", signUpData.user.id);
      }

      if (signUpData.session) {
        router.push(isSeller ? "/seller" : "/");
        router.refresh();
        return;
      }

      router.push(`/auth/verify?email=${encodeURIComponent(data.email)}`);
    } catch (e: unknown) {
      setError(authErrorMessage(e) || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-muted">
          Je m&apos;inscris en tant que
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setValue("role", "buyer", { shouldValidate: true })}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition ${
              currentRole === "buyer"
                ? "border-coral bg-coral/10 text-white"
                : "border-white/10 bg-onyx text-muted hover:border-white/20"
            }`}
          >
            <ShoppingBag className="w-5 h-5 mb-1 text-coral" />
            <span className="text-sm font-medium">Acheteur</span>
          </button>
          <button
            type="button"
            onClick={() => setValue("role", "seller", { shouldValidate: true })}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition ${
              currentRole === "seller"
                ? "border-champagne bg-champagne/10 text-white"
                : "border-white/10 bg-onyx text-muted hover:border-white/20"
            }`}
          >
            <Store className="w-5 h-5 mb-1 text-champagne" />
            <span className="text-sm font-medium">Vendeur</span>
          </button>
        </div>
        {errors.role && (
          <p className="text-xs text-red-400">{errors.role.message}</p>
        )}
      </div>

      <Input
        label="Nom complet"
        {...register("full_name")}
        error={errors.full_name?.message}
        placeholder="Jean Dupont"
      />
      <Input
        label="Nom d'utilisateur"
        {...register("username")}
        error={errors.username?.message}
        placeholder="jeandupont"
      />
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        {...register("email")}
        error={errors.email?.message}
        placeholder="jean@example.com"
      />
      <Input
        label="Âge"
        type="number"
        {...register("age")}
        error={errors.age?.message}
        placeholder="18"
      />
      <div>
        <PasswordInput
          label="Mot de passe"
          autoComplete="new-password"
          {...register("password")}
          error={errors.password?.message}
          placeholder="••••••••"
        />
        <PasswordStrength password={password} />
      </div>

      <div className="space-y-1">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            {...register("terms")}
            className="mt-1 w-4 h-4 rounded border-white/20 bg-onyx text-coral focus:ring-coral"
          />
          <span className="text-sm text-muted">
            J&apos;accepte les{" "}
            <Link href="/legal/terms" className="text-coral hover:underline">
              Conditions Générales d&apos;Utilisation
            </Link>{" "}
            et la{" "}
            <Link href="/legal/privacy" className="text-coral hover:underline">
              Politique de confidentialité
            </Link>
            . Je certifie avoir au moins 18 ans.
          </span>
        </label>
        {errors.terms && (
          <p className="text-xs text-red-400">{errors.terms.message}</p>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" loading={loading}>
        Créer mon compte
      </Button>
    </form>
  );
}
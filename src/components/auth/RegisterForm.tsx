"use client";

import { useEffect, useState } from "react";
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

const TERMS_VERSION = "1.0";

const schema = z.object({
  account_type: z.enum(["buyer", "seller"]),
  email: z.string().email("Email invalide"),
  username: z.string().min(3, "Minimum 3 caractères").max(30),
  full_name: z.string().min(2, "Nom requis"),
  age: z.coerce.number().min(18, "Vous devez avoir au moins 18 ans"),
  password: z.string().refine((val) => checkPasswordStrength(val).isValid, {
    message: "Mot de passe trop faible",
  }),
  terms: z.literal(true, {
    errorMap: () => ({ message: "Vous devez accepter les CGU et la Politique de confidentialité" }),
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
    defaultValues: { account_type: "buyer" },
  });

  // Lien « Créer un compte vendeur » : présélectionne Vendeur
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("type") === "seller") {
      setValue("account_type", "seller");
    }
  }, [setValue]);

  const accountType = watch("account_type");

  const password = watch("password", "");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          // Le lien de confirmation reçu par e-mail revient ici
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          // L'âge et l'acceptation des CGU sont enregistrés dans le profil par un
          // trigger SQL (migration 008) : ça marche même sans session avant confirmation.
          data: {
            account_type: data.account_type,
            username: data.username,
            full_name: data.full_name,
            age: data.age,
            terms_accepted: true,
            terms_version: TERMS_VERSION,
          },
        },
      });
      if (signUpError) throw signUpError;

      // E-mail déjà inscrit : Supabase renvoie un utilisateur sans identité (anti-énumération)
      if (signUpData.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
        setError("Un compte existe déjà avec cet e-mail. Connectez-vous ou réinitialisez votre mot de passe.");
        return;
      }

      // Session présente = la confirmation d'e-mail est désactivée dans Supabase
      if (signUpData.session) {
        router.push(data.account_type === "seller" ? "/seller/onboard" : "/");
        router.refresh();
        return;
      }

      router.push(`/auth/verify?email=${encodeURIComponent(data.email)}`);
    } catch (e: unknown) {
      setError(
        authErrorMessage(e instanceof Error ? e : { message: "Erreur lors de l'inscription" })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Type de compte */}
      <div>
        <p className="text-sm font-medium text-muted mb-2">Je veux</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "buyer", title: "Acheter", desc: "Regarder les lives et acheter" },
            { value: "seller", title: "Vendre", desc: "Publier, passer en live" },
          ].map((opt) => (
            <label
              key={opt.value}
              className={`cursor-pointer rounded-2xl border p-3 text-center transition ${
                accountType === opt.value ? "border-coral bg-coral/10" : "border-white/10 bg-onyx"
              }`}
            >
              <input type="radio" value={opt.value} {...register("account_type")} className="sr-only" />
              <span className="block text-sm font-semibold text-white">{opt.title}</span>
              <span className="block text-[11px] text-muted mt-0.5">{opt.desc}</span>
            </label>
          ))}
        </div>
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

      {/* Terms of Service – mandatory */}
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
        {errors.terms && <p className="text-xs text-red-400">{errors.terms.message}</p>}
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

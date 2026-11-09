"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { cn } from "@/lib/utils";
import { Loader2, Store, ShoppingBag } from "lucide-react";

type Role = "buyer" | "seller";

interface SignupFormProps {
  className?: string;
}

// Liste de pays (tu pourras l'étendre ou l'ajuster selon tes besoins)
const COUNTRIES = [
  { code: "TG", name: "Togo" },
  { code: "BJ", name: "Bénin" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "BF", name: "Burkina Faso" },
  { code: "FR", name: "France" },
  { code: "OTHER", name: "Autre" },
];

export default function SignupForm({ className }: SignupFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [role, setRole] = useState<Role>("buyer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState("TG");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fonction de validation pour un mot de passe fort
  const validatePassword = (pass: string) => {
    const minLength = pass.length >= 8;
    const hasUpperCase = /[A-Z]/.test(pass);
    const hasLowerCase = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pass);

    return minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Vérification des conditions d'utilisation
    if (!acceptTerms) {
      setError("Vous devez accepter les conditions d'utilisation.");
      return;
    }

    // Vérification du mot de passe fort
    if (!validatePassword(password)) {
      setError(
        "Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial."
      );
      return;
    }

    setLoading(true);

    try {
      // Envoi de l'inscription avec les métadonnées supplémentaires (pays, date de naissance, rôle)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            role,
            full_name: fullName.trim() || null,
            username: email.split("@")[0],
            birth_date: birthDate,
            country: country,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Mise à jour de la table profiles si nécessaire
        await supabase
          .from("profiles")
          .update({
            role,
            // Si tes colonnes existent en base, tu peux aussi les décommenter :
            // birth_date: birthDate,
            // country: country,
          })
          .eq("id", data.user.id);

        router.push(role === "seller" ? "/seller/dashboard" : "/");
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erreur lors de la création du compte.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-5 max-w-md mx-auto", className)}
    >
      {/* Choix du rôle */}
      <div>
        <p className="text-sm text-neutral-400 mb-3 text-center">
          Je veux créer un compte en tant que :
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole("buyer")}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition",
              role === "buyer"
                ? "border-red-500 bg-red-500/10 text-white"
                : "border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-500"
            )}
          >
            <ShoppingBag className="w-7 h-7" />
            <span className="font-semibold text-sm">Acheteur</span>
          </button>

          <button
            type="button"
            onClick={() => setRole("seller")}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition",
              role === "seller"
                ? "border-red-500 bg-red-500/10 text-white"
                : "border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-500"
            )}
          >
            <Store className="w-7 h-7" />
            <span className="font-semibold text-sm">Vendeur</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <Input
          type="text"
          placeholder="Nom complet"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={loading}
        />

        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />

        {/* Date de naissance */}
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Date de naissance</label>
          <Input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {/* Choix du pays */}
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Pays</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
            disabled={loading}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code} className="bg-neutral-900">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Mot de passe fort */}
        <PasswordInput
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />
        <p className="text-[11px] text-neutral-500">
          8+ caractères, incluant majuscule, minuscule, chiffre et caractère spécial.
        </p>

        {/* Conditions d'utilisation */}
        <div className="flex items-start gap-2 pt-2">
          <input
            type="checkbox"
            id="terms"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-1 rounded border-neutral-700 bg-neutral-900 text-red-500 focus:ring-red-500"
            required
          />
          <label htmlFor="terms" className="text-xs text-neutral-400">
            J&apos;accepte les{" "}
            <a href="/terms" className="text-red-500 hover:underline" target="_blank">
              conditions d&apos;utilisation
            </a>{" "}
            et la politique de confidentialité.
          </label>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 text-center bg-red-500/10 rounded-xl py-2.5 px-3">
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Création en cours...
          </>
        ) : (
          `Créer mon compte ${role === "seller" ? "Vendeur" : "Acheteur"}`
        )}
      </Button>

      <p className="text-xs text-neutral-500 text-center">
        Rôle sélectionné :{" "}
        <span className="text-white font-medium capitalize">
          {role === "seller" ? "Vendeur" : "Acheteur"}
        </span>
      </p>
    </form>
  );
}

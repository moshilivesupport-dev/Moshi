"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface SignupFormProps {
  className?: string;
}

export default function SignupForm({ className }: SignupFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [birthday, setBirthday] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeUsername = (value: string) =>
    value
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9._]/g, "")
      .slice(0, 24);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password || password.length < 6) {
      setError("Email et mot de passe (6 caractères min.) requis.");
      return;
    }

    if (!username.trim()) {
      setUsername(normalizeUsername(email.split("@")[0] || "user"));
    }

    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanUsername = normalizeUsername(username || email.split("@")[0]);

    if (cleanUsername.length < 3) {
      setError("Le nom d’utilisateur doit faire au moins 3 caractères.");
      setLoading(false);
      return;
    }

    try {
      // Compte standard type TikTok — rôle acheteur par défaut
      // Devenir vendeur = parcours /seller plus tard
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            role: "acheteur",
            username: cleanUsername,
            full_name: cleanUsername,
            birthday: birthday || null,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        await supabase
          .from("profiles")
          .update({
            role: "acheteur",
            username: cleanUsername,
            full_name: cleanUsername,
          })
          .eq("id", data.user.id);

        router.push("/");
        router.refresh();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de la création du compte.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      {step === 1 ? (
        <form onSubmit={handleContinue} className="space-y-4">
          <Input
            type="email"
            label="E-mail"
            placeholder="Ex. nom@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            disabled={loading}
          />
          <Input
            type="password"
            label="Mot de passe"
            placeholder="6 caractères minimum"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={6}
            disabled={loading}
          />

          {error && (
            <p className="text-sm text-red-400 text-center bg-red-500/10 rounded-xl py-2.5 px-3">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg">
            Continuer
          </Button>

          <p className="text-[11px] text-neutral-500 text-center leading-relaxed">
            En continuant, vous acceptez les{" "}
            <Link href="/legal/terms" className="text-neutral-300 underline">
              Conditions d’utilisation
            </Link>{" "}
            et la{" "}
            <Link href="/legal/privacy" className="text-neutral-300 underline">
              Politique de confidentialité
            </Link>{" "}
            de Moshi.
          </p>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="text-sm text-neutral-400 hover:text-white mb-2"
          >
            ← Retour
          </button>

          <Input
            type="text"
            label="Nom d’utilisateur"
            placeholder="Ex. moussa_dev"
            value={username}
            onChange={(e) => setUsername(normalizeUsername(e.target.value))}
            autoComplete="username"
            required
            disabled={loading}
          />
          <Input
            type="date"
            label="Date de naissance"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            disabled={loading}
          />

          {error && (
            <p className="text-sm text-red-400 text-center bg-red-500/10 rounded-xl py-2.5 px-3">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" loading={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Création...
              </>
            ) : (
              "S’inscrire"
            )}
          </Button>

          <p className="text-xs text-neutral-500 text-center">
            Vous pourrez devenir vendeur plus tard depuis votre profil.
          </p>
        </form>
      )}
    </div>
  );
}
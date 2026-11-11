"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { Loader2, Store, ShoppingBag } from "lucide-react";

type Role = "acheteur" | "vendeur";

interface SignupFormProps {
  className?: string;
}

export default function SignupForm({ className }: SignupFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [role, setRole] = useState<Role>("acheteur");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeUsername = (value: string) =>
    value
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9._]/g, "")
      .slice(0, 24);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanUsername = normalizeUsername(
      username || email.split("@")[0] || "user"
    );

    if (cleanUsername.length < 3) {
      setError("Nom d'utilisateur : 3 caractères minimum.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Mot de passe : 6 caractères minimum.");
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            role,
            full_name: fullName.trim() || cleanUsername,
            username: cleanUsername,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Force le rôle en base (si le trigger rate)
        await supabase
          .from("profiles")
          .update({
            role,
            username: cleanUsername,
            full_name: fullName.trim() || cleanUsername,
            seller_status: role === "vendeur" ? "approved" : "none",
          })
          .eq("id", data.user.id);

        if (role === "vendeur") {
          router.push("/seller/live");
        } else {
          router.push("/");
        }
        router.refresh();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Erreur lors de la création du compte.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex flex-col gap-5 max-w-md mx-auto", className)}
    >
      <div>
        <p className="text-sm text-neutral-400 mb-3 text-center">
          Je crée un compte en tant que :
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole("acheteur")}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition",
              role === "acheteur"
                ? "border-red-500 bg-red-500/10 text-white"
                : "border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-500"
            )}
          >
            <ShoppingBag className="w-7 h-7" />
            <span className="font-semibold text-sm">Acheteur</span>
          </button>

          <button
            type="button"
            onClick={() => setRole("vendeur")}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition",
              role === "vendeur"
                ? "border-red-500 bg-red-500/10 text-white"
                : "border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-500"
            )}
          >
            <Store className="w-7 h-7" />
            <span className="font-semibold text-sm">Vendeur</span>
          </button>
        </div>
      </div>

      <Input
        label="Nom affiché"
        type="text"
        placeholder="Votre nom"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        disabled={loading}
      />
      <Input
        label="Nom d'utilisateur"
        type="text"
        placeholder="ex. cosmeticslab"
        value={username}
        onChange={(e) => setUsername(normalizeUsername(e.target.value))}
        disabled={loading}
      />
      <Input
        label="Email"
        type="email"
        placeholder="nom@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
        disabled={loading}
      />
      <Input
        label="Mot de passe"
        type="password"
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

      <Button type="submit" disabled={loading} className="w-full" size="lg">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Création...
          </>
        ) : (
          `Créer mon compte ${role === "vendeur" ? "Vendeur" : "Acheteur"}`
        )}
      </Button>

      <p className="text-[11px] text-neutral-500 text-center leading-relaxed">
        En continuant, vous acceptez les{" "}
        <Link href="/legal/terms" className="text-neutral-300 underline">
          Conditions
        </Link>{" "}
        et la{" "}
        <Link href="/legal/privacy" className="text-neutral-300 underline">
          Confidentialité
        </Link>
        .
      </p>
    </form>
  );
}
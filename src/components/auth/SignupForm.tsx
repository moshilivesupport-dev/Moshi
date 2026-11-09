"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { Loader2, Store, ShoppingBag } from "lucide-react";

type Role = "buyer" | "seller";

interface SignupFormProps {
  className?: string;
}

export default function SignupForm({ className }: SignupFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [role, setRole] = useState<Role>("buyer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Envoi du rôle dans les metadata (lu par le trigger SQL)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            role,
            full_name: fullName.trim() || null,
            username: email.split("@")[0],
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Sécurité supplémentaire : mise à jour directe du profil
        await supabase
          .from("profiles")
          .update({ role })
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
        <Input
          type="password"
          placeholder="Mot de passe (min. 6 caractères)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          disabled={loading}
        />
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

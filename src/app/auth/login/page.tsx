"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isLogin, setIsLogin] = useState(true); // Bascule entre Login et Inscription
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // CONNEXION
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // INSCRIPTION
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Compte créé ! Vérifie tes emails pour confirmer ton adresse.");
      }

      // Si succès, on redirige vers l'accueil (ou le profil)
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-moshi-bg flex flex-col items-center justify-center px-6">
      
      {/* LOGO */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-2xl moshi-gradient flex items-center justify-center text-white font-extrabold text-3xl shadow-lg mx-auto mb-4">
          M
        </div>
        <h1 className="text-2xl font-bold text-moshi-text">
          {isLogin ? "Bon retour sur Moshi" : "Rejoins Moshi"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isLogin ? "Connecte-toi pour continuer" : "Crée ton compte en un instant"}
        </p>
      </div>

      {/* FORMULAIRE */}
      <form onSubmit={handleAuth} className="w-full max-w-sm space-y-4">
        
        {/* Email */}
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="email"
            placeholder="Ton email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple focus:ring-2 focus:ring-moshi-purple/20 outline-none text-sm font-medium"
          />
        </div>

        {/* Mot de passe */}
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="password"
            placeholder="Ton mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple focus:ring-2 focus:ring-moshi-purple/20 outline-none text-sm font-medium"
          />
        </div>

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 text-red-500 text-xs font-semibold p-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Bouton Valider */}
        <button
          type="submit"
          disabled={loading}
          className="w-full moshi-gradient text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-purple-200/50 active:scale-95 transition flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? "Se connecter" : "Créer mon compte"}
        </button>
      </form>

      {/* Bascule Login / Inscription */}
      <button
        onClick={() => { setIsLogin(!isLogin); setError(null); }}
        className="mt-6 text-sm font-semibold text-moshi-purple"
      >
        {isLogin ? "Pas de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
      </button>
    </div>
  );
}
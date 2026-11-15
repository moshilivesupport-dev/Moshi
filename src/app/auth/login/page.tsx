"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Mail, X, Loader2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<"choice" | "email">("choice");
  const [isLogin, setIsLogin] = useState(false); // false = Inscription, true = Connexion
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Connexion
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // Inscription
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Compte créé ! Vérifie tes emails pour confirmer ton adresse, puis connecte-toi.");
        setIsLogin(true); // Bascule sur le mode connexion après l'inscription
        setLoading(false);
        return;
      }
      // Si succès : on redirige vers l'accueil
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-moshi-bg flex flex-col px-6 pt-6 pb-10">
      
      {/* HEADER (Croix pour retourner à l'accueil) */}
      <div className="flex justify-between items-center mb-10">
        <button 
          onClick={() => router.push("/")} 
          className="w-9 h-9 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-600 active:scale-95 transition"
        >
          <X size={20} />
        </button>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className="flex-1 flex flex-col items-center">
        
        {/* LOGO */}
        <div className="mb-6">
          <Image
            src="/brand/moshi-logo.jpg"
            alt="Moshi"
            width={120}
            height={40}
            className="h-12 w-auto object-contain"
            priority
          />
        </div>

        {/* TITRE */}
        <h1 className="text-3xl font-extrabold text-moshi-text text-center mb-2">
          {step === "choice" ? "Bienvenue sur Moshi" : isLogin ? "Connexion" : "Créer un compte"}
        </h1>
        <p className="text-sm text-gray-500 text-center mb-8 max-w-xs">
          {step === "choice" ? "Rejoins la nouvelle ère du Live Shopping" : "Entre ton email et ton mot de passe pour continuer"}
        </p>

        {/* --- ETAPE 1 : CHOIX --- */}
        {step === "choice" && (
          <div className="w-full max-w-sm space-y-4">
            
            <button
              onClick={() => { setStep("email"); setIsLogin(false); }}
              className="w-full moshi-gradient text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-purple-200/50 active:scale-95 transition"
            >
              Créer un compte avec un e-mail
            </button>

            <button
              onClick={() => { setStep("email"); setIsLogin(true); }}
              className="w-full bg-white border border-gray-200 text-moshi-text font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-sm active:scale-95 transition"
            >
              <Mail className="w-5 h-5 text-moshi-purple" />
              J'ai déjà un compte
            </button>

          </div>
        )}

        {/* --- ETAPE 2 : EMAIL --- */}
        {step === "email" && (
          <form onSubmit={handleEmailAuth} className="w-full max-w-sm space-y-4">
            
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                placeholder="Ton email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple focus:ring-2 focus:ring-moshi-purple/20 outline-none text-sm font-medium"
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                placeholder="Ton mot de passe (min. 6 caractères)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple focus:ring-2 focus:ring-moshi-purple/20 outline-none text-sm font-medium"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-500 text-xs font-semibold p-3 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full moshi-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-200/50 active:scale-95 transition flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? (
                "Se connecter"
              ) : (
                "Créer mon compte"
              )}
              {!loading && <ArrowRight size={18} />}
            </button>

            {/* Lien basculer entre login et inscription */}
            <div className="text-center mt-4 text-sm text-gray-500 font-medium">
              {isLogin ? "Pas encore de compte ? " : "Déjà un compte ? "}
              <button 
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="font-bold text-moshi-purple"
              >
                {isLogin ? "S'inscrire" : "Se connecter"}
              </button>
            </div>

            <button 
              type="button"
              onClick={() => setStep("choice")}
              className="w-full text-center text-sm font-semibold text-gray-400 mt-2"
            >
              ← Retour
            </button>
          </form>
        )}

      </div>

      {/* FOOTER */}
      <div className="text-center text-[10px] text-gray-400 mt-8 px-4 leading-relaxed">
        En continuant, tu acceptes nos <span className="font-semibold text-gray-600">Conditions d'utilisation</span> et notre <span className="font-semibold text-gray-600">Politique de confidentialité</span>.
      </div>
    </div>
  );
}
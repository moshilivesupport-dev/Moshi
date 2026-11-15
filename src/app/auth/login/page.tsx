"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Mail, Phone, X, Loader2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<"choice" | "email" | "phone">("choice");
  const [isLogin, setIsLogin] = useState(false); // Par défaut : Inscription
  
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
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Compte créé ! Vérifie tes emails pour confirmer ton adresse.");
      }
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
      
      {/* HEADER (Croix pour fermer) */}
      <div className="flex justify-between items-center mb-10">
        <button onClick={() => router.push("/")} className="w-8 h-8 rounded-full bg-gray-200/50 flex items-center justify-center text-gray-600">
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
          {step === "choice" ? "Bienvenue sur Moshi" : isLogin ? "Connexion" : "Inscription"}
        </h1>
        <p className="text-sm text-gray-500 text-center mb-8">
          {step === "choice" ? "Rejoins la nouvelle ère du Live Shopping" : "Remplis tes informations pour continuer"}
        </p>

        {/* --- ETAPE 1 : CHOIX DE LA METHODE --- */}
        {step === "choice" && (
          <div className="w-full max-w-sm space-y-3">
            
            {/* Bouton Email */}
            <button
              onClick={() => { setStep("email"); setIsLogin(false); }}
              className="w-full bg-white border border-gray-200 text-moshi-text font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-sm active:scale-95 transition"
            >
              <Mail className="w-5 h-5 text-gray-700" />
              Continuer avec un e-mail
            </button>

            {/* Bouton Téléphone */}
            <button
              onClick={() => { setStep("phone"); setIsLogin(false); }}
              className="w-full bg-white border border-gray-200 text-moshi-text font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-sm active:scale-95 transition"
            >
              <Phone className="w-5 h-5 text-gray-700" />
              Continuer avec un téléphone
            </button>

            {/* Lien Se Connecter */}
            <div className="text-center mt-8 text-sm text-gray-500 font-medium">
              Tu as déjà un compte ?{" "}
              <button 
                onClick={() => { setStep("email"); setIsLogin(true); }}
                className="font-bold text-moshi-purple"
              >
                Se connecter
              </button>
            </div>
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
                placeholder="Ton mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple focus:ring-2 focus:ring-moshi-purple/20 outline-none text-sm font-medium"
              />
            </div>

            {error && <div className="bg-red-50 text-red-500 text-xs font-semibold p-3 rounded-xl">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full moshi-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-200/50 active:scale-95 transition flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? "Se connecter" : "Créer mon compte"}
              {!loading && <ArrowRight size={18} />}
            </button>

            <button 
              type="button"
              onClick={() => setStep("choice")}
              className="w-full text-center text-sm font-semibold text-gray-400 mt-2"
            >
              Retour
            </button>
          </form>
        )}

        {/* --- ETAPE 3 : TELEPHONE (Design uniquement pour l'instant) --- */}
        {step === "phone" && (
          <div className="w-full max-w-sm space-y-4">
             <div className="flex gap-2">
               <div className="w-1/3 bg-white border border-gray-200 rounded-2xl px-3 py-4 text-sm font-semibold flex items-center justify-center">
                 TG +228
               </div>
               <input
                type="tel"
                placeholder="Numéro de téléphone"
                className="flex-1 px-4 py-4 rounded-2xl bg-white border border-gray-200 outline-none text-sm font-medium"
              />
             </div>
             <button onClick={() => alert("La connexion par téléphone nécessite l'activation de Twilio sur Supabase. Utilise l'email pour l'instant.")} className="w-full moshi-gradient text-white font-bold py-4 rounded-2xl shadow-lg mt-4">
               Continuer
             </button>
             <button onClick={() => setStep("choice")} className="w-full text-center text-sm font-semibold text-gray-400 mt-2">
              Retour
            </button>
          </div>
        )}

      </div>

      {/* FOOTER (Conditions) */}
      <div className="text-center text-[10px] text-gray-400 mt-8 px-4 leading-relaxed">
        En continuant, tu acceptes nos <span className="font-semibold text-gray-600">Conditions d'utilisation</span> et reconnais avoir lu notre <span className="font-semibold text-gray-600">Politique de confidentialité</span>.
      </div>
    </div>
  );
}
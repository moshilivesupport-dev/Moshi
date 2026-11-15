"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Mail, X, Loader2, ArrowRight, Eye, EyeOff, Check, User, Phone, Calendar, Globe, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1); // 1: Email/Pseudo, 2: Infos, 3: Mot de passe
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Données du formulaire
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI
  const [showPassword, setShowPassword] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  // --- VERIFICATION DU NOM D'UTILISATEUR ---
  useEffect(() => {
    if (username.length < 3) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username)
        .maybeSingle();
      
      if (data) setUsernameStatus("taken");
      else setUsernameStatus("available");
    }, 500); // Anti-rebond (500ms)
    return () => clearTimeout(timer);
  }, [username, supabase]);

  // --- VALIDATION DU MOT DE PASSE ---
  const isPasswordStrong = 
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

  // --- SOUMISSION FINALE ---
  const handleSignup = async () => {
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (!isPasswordStrong) {
      setError("Le mot de passe n'est pas assez fort.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: `${firstName} ${lastName}`,
            first_name: firstName,
            last_name: lastName,
            phone,
            birth_date: birthDate,
            gender,
            country,
          },
        },
      });

      if (error) throw error;
      
      alert("Compte créé ! Vérifie tes emails pour confirmer ton adresse.");
      router.push("/");
      router.refresh();

    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-moshi-bg flex flex-col px-6 pt-6 pb-10 overflow-y-auto">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={() => step > 1 ? setStep(step - 1) : router.push("/")} 
          className="w-9 h-9 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-600 active:scale-95 transition"
        >
          {step > 1 ? <ArrowRight className="rotate-180" size={20} /> : <X size={20} />}
        </button>
        <div className="flex gap-1">
          {[1, 2, 3].map((s) => (
            <div key={s} className={cn("w-2 h-2 rounded-full", step >= s ? "bg-moshi-purple" : "bg-gray-300")} />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center">
        
        {/* LOGO */}
        {step === 1 && (
          <div className="mb-6">
            <Image src="/brand/moshi-logo.jpg" alt="Moshi" width={120} height={40} className="h-12 w-auto object-contain" priority />
          </div>
        )}

        <h1 className="text-2xl font-extrabold text-moshi-text text-center mb-6">
          {step === 1 && "Créer ton compte"}
          {step === 2 && "Faisons connaissance"}
          {step === 3 && "Sécurise ton compte"}
        </h1>

        {/* -------------------- ETAPE 1 : EMAIL + USERNAME -------------------- */}
        {step === 1 && (
          <div className="w-full max-w-sm space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                placeholder="Ton email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium"
              />
            </div>

            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Nom d'utilisateur (ex: moshishop)"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                className={cn(
                  "w-full pl-12 pr-12 py-4 rounded-2xl bg-white border outline-none text-sm font-medium",
                  usernameStatus === "available" ? "border-green-400 focus:border-green-500" : 
                  usernameStatus === "taken" ? "border-red-400 focus:border-red-500" : "border-gray-200 focus:border-moshi-purple"
                )}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {usernameStatus === "checking" && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
                {usernameStatus === "available" && <Check className="w-5 h-5 text-green-500" />}
                {usernameStatus === "taken" && <X className="w-5 h-5 text-red-500" />}
              </div>
            </div>
            {usernameStatus === "taken" && <p className="text-red-500 text-xs ml-2">Ce nom d'utilisateur est déjà pris.</p>}
            {usernameStatus === "available" && <p className="text-green-500 text-xs ml-2">Ce nom d'utilisateur est disponible !</p>}

            <button
              onClick={() => setStep(2)}
              disabled={!email || usernameStatus !== "available"}
              className="w-full moshi-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-200/50 active:scale-95 transition disabled:opacity-50 mt-4"
            >
              Continuer
            </button>
          </div>
        )}

        {/* -------------------- ETAPE 2 : INFOS PERSONNELLES -------------------- */}
        {step === 2 && (
          <div className="w-full max-w-sm space-y-3">
            <div className="flex gap-3">
              <input
                type="text" placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium"
              />
              <input
                type="text" placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium text-gray-500"
              />
            </div>

            <div className="relative">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={gender} onChange={(e) => setGender(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium text-gray-600 appearance-none"
              >
                <option value="" disabled>Sexe</option>
                <option value="Femme">Femme</option>
                <option value="Homme">Homme</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text" placeholder="Pays" value={country} onChange={(e) => setCountry(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium"
              />
            </div>

            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel" placeholder="Numéro de téléphone (optionnel)" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium"
              />
            </div>

            <button
              onClick={() => setStep(3)}
              disabled={!firstName || !lastName || !birthDate}
              className="w-full moshi-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-200/50 active:scale-95 transition disabled:opacity-50 mt-4"
            >
              Continuer
            </button>
          </div>
        )}

        {/* -------------------- ETAPE 3 : MOT DE PASSE -------------------- */}
        {step === 3 && (
          <div className="w-full max-w-sm space-y-4">
            
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium"
              />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirme le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={cn(
                  "w-full px-4 py-4 rounded-2xl bg-white border outline-none text-sm font-medium",
                  confirmPassword && password !== confirmPassword ? "border-red-400" : "border-gray-200 focus:border-moshi-purple"
                )}
              />
            </div>

            {/* Indicateur de force du mot de passe */}
            <div className="bg-gray-100 p-3 rounded-xl space-y-1">
              <p className="text-xs text-gray-500 font-semibold mb-1">Le mot de passe doit contenir :</p>
              <p className={cn("text-xs flex items-center gap-1", password.length >= 8 ? "text-green-500" : "text-gray-400")}>
                {password.length >= 8 ? <Check size={12}/> : <X size={12}/>} Au moins 8 caractères
              </p>
              <p className={cn("text-xs flex items-center gap-1", /[A-Z]/.test(password) ? "text-green-500" : "text-gray-400")}>
                {/[A-Z]/.test(password) ? <Check size={12}/> : <X size={12}/>} Une majuscule
              </p>
              <p className={cn("text-xs flex items-center gap-1", /[0-9]/.test(password) ? "text-green-500" : "text-gray-400")}>
                {/[0-9]/.test(password) ? <Check size={12}/> : <X size={12}/>} Un chiffre
              </p>
              <p className={cn("text-xs flex items-center gap-1", /[^A-Za-z0-9]/.test(password) ? "text-green-500" : "text-gray-400")}>
                {/[^A-Za-z0-9]/.test(password) ? <Check size={12}/> : <X size={12}/>} Un caractère spécial (@, #, !...)
              </p>
            </div>

            {error && <div className="bg-red-50 text-red-500 text-xs font-semibold p-3 rounded-xl">{error}</div>}

            <button
              onClick={handleSignup}
              disabled={loading || !isPasswordStrong || password !== confirmPassword}
              className="w-full moshi-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-200/50 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "S'inscrire"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
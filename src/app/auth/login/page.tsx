"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Mail, X, Loader2, ArrowRight, Eye, EyeOff, Check, User, Phone, Calendar, Globe, Users, ShoppingBag, Store } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1); // 1: Rôle, 2: Email/Pseudo, 3: Infos, 4: Mot de passe
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Données
  const [role, setRole] = useState<"acheteur" | "vendeur" | "">("");
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

  // Vérif Username
  useEffect(() => {
    if (username.length < 3) { setUsernameStatus("idle"); return; }
    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("username").eq("username", username).maybeSingle();
      if (data) setUsernameStatus("taken"); else setUsernameStatus("available");
    }, 500);
    return () => clearTimeout(timer);
  }, [username, supabase]);

  // Vérif Mot de passe
  const isPasswordStrong = password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);

  // Soumission
  const handleSignup = async () => {
    if (password !== confirmPassword) { setError("Les mots de passe ne correspondent pas."); return; }
    if (!isPasswordStrong) { setError("Le mot de passe n'est pas assez fort."); return; }

    setLoading(true);
    setError(null);

    try {
      // 1. Créer l'utilisateur dans Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
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
            role,
          },
        },
      });

      if (authError) throw authError;

      // 2. Créer le profil manuellement dans la table profiles
      if (authData.user) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: authData.user.id,
          username: username,
          full_name: `${firstName} ${lastName}`,
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          birth_date: birthDate || null,
          gender: gender,
          country: country,
          role: role,
        });

        if (profileError) {
          throw new Error("Erreur profil : " + profileError.message);
        }
      }

      alert("Compte créé avec succès !");
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
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={cn("w-2 h-2 rounded-full transition-colors", step >= s ? "bg-moshi-purple" : "bg-gray-300")} />
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

        <h1 className="text-2xl font-extrabold text-moshi-text text-center mb-2">
          {step === 1 && "Rejoins Moshi"}
          {step === 2 && "Créer ton compte"}
          {step === 3 && "Faisons connaissance"}
          {step === 4 && "Sécurise ton compte"}
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6 max-w-xs">
          {step === 1 && "Choisis comment tu veux utiliser Moshi"}
          {step === 2 && "Un email et un nom d'utilisateur unique"}
          {step === 3 && "Quelques infos pour personnaliser ton profil"}
          {step === 4 && "Un mot de passe fort pour protéger ton compte"}
        </p>

        {/* -------------------- ETAPE 1 : CHOIX DU ROLE -------------------- */}
        {step === 1 && (
          <div className="w-full max-w-sm space-y-4">
            
            {/* ACHETEUR */}
            <button
              onClick={() => setRole("acheteur")}
              className={cn(
                "w-full p-5 rounded-2xl border-2 text-left transition-all",
                role === "acheteur" ? "border-moshi-purple bg-purple-50" : "border-gray-200 bg-white"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", role === "acheteur" ? "moshi-gradient text-white" : "bg-gray-100 text-gray-500")}>
                  <ShoppingBag size={22} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-moshi-text">Je suis Acheteur</h3>
                  <p className="text-xs text-gray-500 mt-1">Découvrir des produits et faire du shopping en live</p>
                </div>
                {role === "acheteur" && <Check className="w-5 h-5 text-moshi-purple" />}
              </div>
            </button>

            {/* VENDEUR */}
            <button
              onClick={() => setRole("vendeur")}
              className={cn(
                "w-full p-5 rounded-2xl border-2 text-left transition-all",
                role === "vendeur" ? "border-moshi-purple bg-purple-50" : "border-gray-200 bg-white"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", role === "vendeur" ? "moshi-gradient text-white" : "bg-gray-100 text-gray-500")}>
                  <Store size={22} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-moshi-text">Je suis Vendeur</h3>
                  <p className="text-xs text-gray-500 mt-1">Vendre mes produits et lancer des lives shopping</p>
                </div>
                {role === "vendeur" && <Check className="w-5 h-5 text-moshi-purple" />}
              </div>
            </button>

            <button
              onClick={() => setStep(2)}
              disabled={!role}
              className="w-full moshi-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-200/50 active:scale-95 transition disabled:opacity-50 mt-4"
            >
              Continuer
            </button>

          </div>
        )}

        {/* -------------------- ETAPE 2 : EMAIL + USERNAME -------------------- */}
        {step === 2 && (
          <div className="w-full max-w-sm space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email" placeholder="Ton email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium"
              />
            </div>

            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text" placeholder="Nom d'utilisateur (ex: moshishop)" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
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
              onClick={() => setStep(3)}
              disabled={!email || usernameStatus !== "available"}
              className="w-full moshi-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-200/50 active:scale-95 transition disabled:opacity-50 mt-4"
            >
              Continuer
            </button>
          </div>
        )}

        {/* -------------------- ETAPE 3 : INFOS PERSONNELLES -------------------- */}
        {step === 3 && (
          <div className="w-full max-w-sm space-y-3">
            <div className="flex gap-3">
              <input type="text" placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium" />
              <input type="text" placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium" />
            </div>

            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium text-gray-500" />
            </div>

            <div className="relative">
              <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select value={gender} onChange={(e) => setGender(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium text-gray-600 appearance-none">
                <option value="" disabled>Sexe</option>
                <option value="Femme">Femme</option>
                <option value="Homme">Homme</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            {/* MENU DÉROULANT POUR LE PAYS */}
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select 
                value={country} 
                onChange={(e) => setCountry(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium text-gray-600 appearance-none"
              >
                <option value="" disabled>Sélectionne ton pays</option>
                <option value="TG">🇹🇬 Togo</option>
                <option value="BJ">🇧🇯 Bénin</option>
                <option value="CI">🇨🇮 Côte d'Ivoire</option>
                <option value="SN">🇸🇳 Sénégal</option>
                <option value="BF">🇧🇫 Burkina Faso</option>
                <option value="ML">🇲🇱 Mali</option>
                <option value="NE">🇳🇪 Niger</option>
                <option value="GH">🇬🇭 Ghana</option>
                <option value="NG">🇳🇬 Nigeria</option>
                <option value="CM">🇨🇲 Cameroun</option>
                <option value="FR">🇫🇷 France</option>
                <option value="US">🇺🇸 États-Unis</option>
                <option value="CA">🇨🇦 Canada</option>
                <option value="OTHER">🌍 Autre</option>
              </select>
            </div>

            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="tel" placeholder="Numéro de téléphone (optionnel)" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium" />
            </div>

            <button
              onClick={() => setStep(4)}
              disabled={!firstName || !lastName || !birthDate}
              className="w-full moshi-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-200/50 active:scale-95 transition disabled:opacity-50 mt-4"
            >
              Continuer
            </button>
          </div>
        )}

        {/* -------------------- ETAPE 4 : MOT DE PASSE -------------------- */}
        {step === 4 && (
          <div className="w-full max-w-sm space-y-4">
            
            <div className="relative">
              <input type={showPassword ? "text" : "password"} placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium" />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="relative">
              <input type={showPassword ? "text" : "password"} placeholder="Confirme le mot de passe" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className={cn("w-full px-4 py-4 rounded-2xl bg-white border outline-none text-sm font-medium", confirmPassword && password !== confirmPassword ? "border-red-400" : "border-gray-200 focus:border-moshi-purple")} />
            </div>

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
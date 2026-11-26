
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  Mail, X, Loader2, ArrowRight, Eye, EyeOff, Check, User,
  Phone, Calendar, Globe, Users, ShoppingBag, Store, LogIn, UserPlus
} from "lucide-react";
import { cn } from "@/lib/utils";

// Liste des pays
const COUNTRIES = [
  { code: "TG", flag: "🇹🇬", name: "Togo", dial: "+228" },
  { code: "BJ", flag: "🇧🇯", name: "Bénin", dial: "+229" },
  { code: "CI", flag: "🇨🇮", name: "Côte d'Ivoire", dial: "+225" },
  { code: "SN", flag: "🇸🇳", name: "Sénégal", dial: "+221" },
  { code: "BF", flag: "🇧🇫", name: "Burkina Faso", dial: "+226" },
  { code: "ML", flag: "🇲🇱", name: "Mali", dial: "+223" },
  { code: "NE", flag: "🇳🇪", name: "Niger", dial: "+227" },
  { code: "GH", flag: "🇬🇭", name: "Ghana", dial: "+233" },
  { code: "NG", flag: "🇳🇬", name: "Nigeria", dial: "+234" },
  { code: "CM", flag: "🇨🇲", name: "Cameroun", dial: "+237" },
  { code: "GA", flag: "🇬🇦", name: "Gabon", dial: "+241" },
  { code: "CD", flag: "🇨🇩", name: "RD Congo", dial: "+243" },
  { code: "CG", flag: "🇨🇬", name: "Congo", dial: "+242" },
  { code: "TD", flag: "🇹🇩", name: "Tchad", dial: "+235" },
  { code: "CF", flag: "🇨🇫", name: "Centrafrique", dial: "+236" },
  { code: "MA", flag: "🇲🇦", name: "Maroc", dial: "+212" },
  { code: "DZ", flag: "🇩🇿", name: "Algérie", dial: "+213" },
  { code: "TN", flag: "🇹🇳", name: "Tunisie", dial: "+216" },
  { code: "EG", flag: "🇪🇬", name: "Égypte", dial: "+20" },
  { code: "FR", flag: "🇫🇷", name: "France", dial: "+33" },
  { code: "BE", flag: "🇧🇪", name: "Belgique", dial: "+32" },
  { code: "CH", flag: "🇨🇭", name: "Suisse", dial: "+41" },
  { code: "CA", flag: "🇨🇦", name: "Canada", dial: "+1" },
  { code: "US", flag: "🇺🇸", name: "États-Unis", dial: "+1" },
  { code: "UK", flag: "🇬🇧", name: "Royaume-Uni", dial: "+44" },
  { code: "DE", flag: "🇩🇪", name: "Allemagne", dial: "+49" },
  { code: "IT", flag: "🇮🇹", name: "Italie", dial: "+39" },
  { code: "ES", flag: "🇪🇸", name: "Espagne", dial: "+34" },
  { code: "PT", flag: "🇵🇹", name: "Portugal", dial: "+351" },
  { code: "BR", flag: "🇧🇷", name: "Brésil", dial: "+55" },
  { code: "CN", flag: "🇨🇳", name: "Chine", dial: "+86" },
  { code: "JP", flag: "🇯🇵", name: "Japon", dial: "+81" },
  { code: "IN", flag: "🇮🇳", name: "Inde", dial: "+91" },
  { code: "AE", flag: "🇦🇪", name: "Émirats Arabes Unis", dial: "+971" },
  { code: "SA", flag: "🇸🇦", name: "Arabie Saoudite", dial: "+966" },
  { code: "ZA", flag: "🇿🇦", name: "Afrique du Sud", dial: "+27" },
  { code: "OTHER", flag: "🌍", name: "Autre", dial: "" },
];

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "error";

function getSupabaseErrorMessage(error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}) {
  return [
    error.code ? `Code ${error.code}` : null,
    error.message || "Erreur Supabase sans détail",
    error.details || null,
    error.hint || null,
  ].filter(Boolean).join(" — ");
}

// Attend une requête avec une limite de temps.
// Compatible avec les versions de Supabase qui ne proposent pas abortSignal().
function withTimeout<T>(
  request: PromiseLike<T>,
  timeoutMs: number
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error(`La requête a dépassé le délai de ${timeoutMs / 1000} secondes.`)
      );
    }, timeoutMs);

    Promise.resolve(request).then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

export default function LoginPage() {
  const router = useRouter();

  const [supabase] = useState(() => createClient());

  const [mode, setMode] = useState<"welcome" | "signup" | "login">("welcome");
  const [step, setStep] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Données inscription
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

  // Données connexion
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  // Vérification du pseudo
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameRetry, setUsernameRetry] = useState(0);

  const [dialCode, setDialCode] = useState("");

  useEffect(() => {
    const selected = COUNTRIES.find((c) => c.code === country);
    setDialCode(selected?.dial || "");
  }, [country]);

  // Vérification du pseudo via RPC sécurisée.
  // Aucun accès direct à la table profiles n'est nécessaire.
  useEffect(() => {
    const normalizedUsername = username.trim().toLowerCase();

    setUsernameError(null);

    if (normalizedUsername.length < 3) {
      setUsernameStatus("idle");
      return;
    }

    let cancelled = false;

    setUsernameStatus("checking");

    const debounceId = setTimeout(async () => {
      try {
        const result = await withTimeout(
          supabase.rpc("is_username_available", {
            p_username: normalizedUsername,
          }),
          10000
        );

        if (cancelled) return;

        const { data, error: queryError } = result;

        if (queryError) {
          console.error("Erreur vérification pseudo :", queryError);

          setUsernameStatus("error");
          setUsernameError(
            `Échec de vérification : ${getSupabaseErrorMessage(queryError)}`
          );
          return;
        }

        if (data === true) {
          setUsernameStatus("available");
          setUsernameError(null);
        } else {
          setUsernameStatus("taken");
          setUsernameError("Ce nom d'utilisateur n'est pas disponible.");
        }
      } catch (err) {
        if (cancelled) return;

        console.error("Erreur inattendue vérification pseudo :", err);

        const message =
          err instanceof Error
            ? err.message
            : String(err);

        setUsernameStatus("error");
        setUsernameError(`Échec de vérification : ${message}`);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(debounceId);
    };
  }, [username, usernameRetry, supabase]);

  const isPasswordStrong =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);

  // INSCRIPTION
  const handleSignup = async () => {
    if (!role) {
      setError("Choisis ton type de compte.");
      return;
    }

    if (!email.trim()) {
      setError("Saisis ton adresse email.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Saisis une adresse email valide.");
      return;
    }

    if (username.trim().length < 3 || usernameStatus !== "available") {
      setError("Choisis un nom d'utilisateur disponible.");
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setError("Renseigne ton prénom et ton nom.");
      return;
    }

    if (!birthDate || !country) {
      setError("Renseigne ta date de naissance et ton pays.");
      return;
    }

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
      const normalizedUsername = username.trim().toLowerCase();

      // Dernière vérification du pseudo avant la création du compte.
      const result = await withTimeout(
        supabase.rpc("is_username_available", {
          p_username: normalizedUsername,
        }),
        10000
      );

      const { data: usernameAvailable, error: checkError } = result;

      if (checkError) {
        throw new Error(
          `Vérification du pseudo impossible : ${getSupabaseErrorMessage(checkError)}`
        );
      }

      if (usernameAvailable !== true) {
        setUsernameStatus("taken");
        setUsernameError("Ce nom d'utilisateur n'est pas disponible.");
        setStep(2);
        throw new Error("Choisis un autre nom d'utilisateur.");
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      const fullPhone = dialCode
        ? `${dialCode} ${phone.trim()}`.trim()
        : phone.trim();

      const { data: authData, error: authError } =
        await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: {
            data: {
              username: normalizedUsername,
              full_name: fullName,
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              phone: fullPhone,
              birth_date: birthDate,
              gender,
              country,
              role,
            },
          },
        });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("La création du compte n'a pas abouti.");
      }

      // Le profil est créé automatiquement par le déclencheur
      // public.handle_new_user() dans Supabase.

      alert(
        authData.session
          ? "Compte créé avec succès !"
          : "Compte créé avec succès ! Vérifie ton email pour confirmer ton inscription."
      );

      setMode("login");
      setLoginEmail(email.trim().toLowerCase());
      setStep(1);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Une erreur est survenue pendant l'inscription.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // CONNEXION
  const handleLogin = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        });

      if (loginError) throw loginError;

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Email ou mot de passe incorrect."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-moshi-bg flex flex-col px-6 pt-6 pb-10 overflow-y-auto">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <button
          type="button"
          onClick={() => {
            if (mode === "signup" && step > 1) {
              setStep(step - 1);
              setError(null);
            } else if (mode === "signup" || mode === "login") {
              setMode("welcome");
              setStep(1);
              setError(null);
            } else {
              router.push("/");
            }
          }}
          className="w-9 h-9 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-600 active:scale-95 transition"
        >
          {mode === "welcome" ? (
            <X size={20} />
          ) : (
            <ArrowRight className="rotate-180" size={20} />
          )}
        </button>

        {mode === "signup" && (
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  step >= s ? "bg-moshi-purple" : "bg-gray-300"
                )}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center">

        {/* ACCUEIL */}
        {mode === "welcome" && (
          <>
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

            <h1 className="text-3xl font-extrabold text-moshi-text text-center mb-2">
              Bienvenue sur Moshi
            </h1>

            <p className="text-sm text-gray-500 text-center mb-10 max-w-xs">
              Rejoins la nouvelle ère du Live Shopping
            </p>

            <div className="w-full max-w-sm space-y-4">
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className="w-full moshi-gradient text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-purple-200/50 active:scale-95 transition"
              >
                <UserPlus size={20} />
                Créer un compte
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                className="w-full bg-white border border-gray-200 text-moshi-text font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm active:scale-95 transition"
              >
                <LogIn size={20} className="text-moshi-purple" />
                J'ai déjà un compte
              </button>
            </div>
          </>
        )}

        {/* CONNEXION */}
        {mode === "login" && (
          <>
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

            <h1 className="text-2xl font-extrabold text-moshi-text text-center mb-2">
              Bon retour !
            </h1>

            <p className="text-sm text-gray-500 text-center mb-8 max-w-xs">
              Connecte-toi pour continuer
            </p>

            <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="Ton email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium"
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mot de passe"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="w-full px-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {error && (
                <div className="bg-red-50 text-red-500 text-xs font-semibold p-3 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full moshi-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-200/50 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Se connecter"
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setStep(1);
                setError(null);
              }}
              className="mt-6 text-sm font-semibold text-moshi-purple"
            >
              Pas encore de compte ? S'inscrire
            </button>
          </>
        )}

        {/* INSCRIPTION */}
        {mode === "signup" && (
          <>
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

            {/* ETAPE 1 : ROLE */}
            {step === 1 && (
              <div className="w-full max-w-sm space-y-4">
                <button
                  type="button"
                  onClick={() => setRole("acheteur")}
                  className={cn(
                    "w-full p-5 rounded-2xl border-2 text-left transition-all",
                    role === "acheteur"
                      ? "border-moshi-purple bg-purple-50"
                      : "border-gray-200 bg-white"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center",
                        role === "acheteur"
                          ? "moshi-gradient text-white"
                          : "bg-gray-100 text-gray-500"
                      )}
                    >
                      <ShoppingBag size={22} />
                    </div>

                    <div className="flex-1">
                      <h3 className="font-bold text-moshi-text">
                        Je suis Acheteur
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Découvrir des produits et faire du shopping en live
                      </p>
                    </div>

                    {role === "acheteur" && (
                      <Check className="w-5 h-5 text-moshi-purple" />
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("vendeur")}
                  className={cn(
                    "w-full p-5 rounded-2xl border-2 text-left transition-all",
                    role === "vendeur"
                      ? "border-moshi-purple bg-purple-50"
                      : "border-gray-200 bg-white"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center",
                        role === "vendeur"
                          ? "moshi-gradient text-white"
                          : "bg-gray-100 text-gray-500"
                      )}
                    >
                      <Store size={22} />
                    </div>

                    <div className="flex-1">
                      <h3 className="font-bold text-moshi-text">
                        Je suis Vendeur
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Vendre mes produits et lancer des lives shopping
                      </p>
                    </div>

                    {role === "vendeur" && (
                      <Check className="w-5 h-5 text-moshi-purple" />
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep(2);
                  }}
                  disabled={!role}
                  className="w-full moshi-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-200/50 active:scale-95 transition disabled:opacity-50 mt-4"
                >
                  Continuer
                </button>
              </div>
            )}

            {/* ETAPE 2 : EMAIL + USERNAME */}
            {step === 2 && (
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
                    onChange={(e) => {
                      setUsername(
                        e.target.value.toLowerCase().replace(/\s/g, "")
                      );
                      setUsernameError(null);
                    }}
                    autoComplete="username"
                    maxLength={30}
                    className={cn(
                      "w-full pl-12 pr-12 py-4 rounded-2xl bg-white border outline-none text-sm font-medium",
                      usernameStatus === "available"
                        ? "border-green-400 focus:border-green-500"
                        : usernameStatus === "taken" ||
                            usernameStatus === "error"
                          ? "border-red-400 focus:border-red-500"
                          : "border-gray-200 focus:border-moshi-purple"
                    )}
                  />

                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {usernameStatus === "checking" && (
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                    )}

                    {usernameStatus === "available" && (
                      <Check className="w-5 h-5 text-green-500" />
                    )}

                    {(usernameStatus === "taken" ||
                      usernameStatus === "error") && (
                      <X className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>

                {username.length > 0 && username.length < 3 && (
                  <p className="text-xs text-gray-500 px-1">
                    Le pseudo doit contenir au moins 3 caractères.
                  </p>
                )}

                {usernameError && (
                  <div className="text-xs font-medium text-red-500 px-1 break-words">
                    {usernameError}
                  </div>
                )}

                {usernameStatus === "available" && (
                  <div className="text-xs font-medium text-green-600 px-1">
                    Ce nom d'utilisateur est disponible.
                  </div>
                )}

                {usernameStatus === "error" && (
                  <button
                    type="button"
                    onClick={() => {
                      setUsernameError(null);
                      setUsernameRetry((value) => value + 1);
                    }}
                    className="text-xs font-semibold text-moshi-purple px-1"
                  >
                    Réessayer la vérification
                  </button>
                )}

                {usernameStatus === "taken" && (
                  <p className="text-xs text-red-500 px-1">
                    Essaie un autre nom d'utilisateur.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep(3);
                  }}
                  disabled={
                    !email.trim() ||
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
                    username.trim().length < 3 ||
                    usernameStatus !== "available"
                  }
                  className="w-full moshi-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-200/50 active:scale-95 transition disabled:opacity-50 mt-4"
                >
                  {usernameStatus === "checking"
                    ? "Vérification du pseudo..."
                    : "Continuer"}
                </button>
              </div>
            )}

            {/* ETAPE 3 : INFOS */}
            {step === 3 && (
              <div className="w-full max-w-sm space-y-3">
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Prénom"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    className="w-full px-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium"
                  />

                  <input
                    type="text"
                    placeholder="Nom"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                    className="w-full px-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium"
                  />
                </div>

                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium text-gray-500"
                  />
                </div>

                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
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
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium text-gray-600 appearance-none"
                  >
                    <option value="" disabled>Sélectionne ton pays</option>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative flex gap-2">
                  <div className="w-[90px] px-3 py-4 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                    {dialCode || "---"}
                  </div>

                  <div className="relative flex-1">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      placeholder="Numéro (sans indicatif)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel-national"
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep(4);
                  }}
                  disabled={!firstName.trim() || !lastName.trim() || !birthDate || !country}
                  className="w-full moshi-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-200/50 active:scale-95 transition disabled:opacity-50 mt-4"
                >
                  Continuer
                </button>
              </div>
            )}

            {/* ETAPE 4 : MOT DE PASSE */}
            {step === 4 && (
              <div className="w-full max-w-sm space-y-4">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full px-4 py-4 rounded-2xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirme le mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className={cn(
                      "w-full px-4 py-4 rounded-2xl bg-white border outline-none text-sm font-medium",
                      confirmPassword && password !== confirmPassword
                        ? "border-red-400"
                        : "border-gray-200 focus:border-moshi-purple"
                    )}
                  />
                </div>

                <div className="bg-gray-100 p-3 rounded-xl space-y-1">
                  <p className="text-xs text-gray-500 font-semibold mb-1">
                    Le mot de passe doit contenir :
                  </p>

                  <p className={cn("text-xs flex items-center gap-1", password.length >= 8 ? "text-green-500" : "text-gray-400")}>
                    {password.length >= 8 ? <Check size={12} /> : <X size={12} />}
                    Au moins 8 caractères
                  </p>

                  <p className={cn("text-xs flex items-center gap-1", /[A-Z]/.test(password) ? "text-green-500" : "text-gray-400")}>
                    {/[A-Z]/.test(password) ? <Check size={12} /> : <X size={12} />}
                    Une majuscule
                  </p>

                  <p className={cn("text-xs flex items-center gap-1", /[0-9]/.test(password) ? "text-green-500" : "text-gray-400")}>
                    {/[0-9]/.test(password) ? <Check size={12} /> : <X size={12} />}
                    Un chiffre
                  </p>

                  <p className={cn("text-xs flex items-center gap-1", /[^A-Za-z0-9]/.test(password) ? "text-green-500" : "text-gray-400")}>
                    {/[^A-Za-z0-9]/.test(password) ? <Check size={12} /> : <X size={12} />}
                    Un caractère spécial (@, #, !...)
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-500 text-xs font-semibold p-3 rounded-xl break-words">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSignup}
                  disabled={
                    loading ||
                    !isPasswordStrong ||
                    password !== confirmPassword
                  }
                  className="w-full moshi-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-200/50 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "S'inscrire"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

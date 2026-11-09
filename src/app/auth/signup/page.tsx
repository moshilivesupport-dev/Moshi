import SignupForm from "@/components/auth/SignupForm";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Créer un compte</h1>
          <p className="text-neutral-400 text-sm mt-2">
            Rejoignez Moshi en tant qu’acheteur ou vendeur
          </p>
        </div>

        {/* Formulaire complet gérant le mot de passe, la date de naissance, le pays et les CGU */}
        <SignupForm />

        <p className="text-center text-sm text-neutral-500 mt-8">
          Déjà un compte ?{" "}
          <Link href="/auth/login" className="text-red-500 font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}

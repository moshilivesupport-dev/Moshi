import { RegisterForm } from "@/components/auth/RegisterForm";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Créer un compte</h1>
          <p className="text-muted text-sm">
            Mot de passe fort obligatoire (8+ car., maj, min, chiffre, spécial)
          </p>
        </div>
        <div className="card">
          <RegisterForm />
        </div>
        <p className="text-center text-sm text-muted mt-6">
          Déjà un compte ?{" "}
          <Link href="/auth/login" className="text-coral hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}

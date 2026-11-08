import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Connexion</h1>
          <p className="text-muted text-sm">Bienvenue sur Moshi</p>
        </div>

        {error === "link_invalid" && (
          <div className="mb-4 text-sm text-champagne bg-champagne/10 border border-champagne/20 rounded-xl px-4 py-3">
            Ce lien est invalide ou a expiré. Si vous avez déjà confirmé votre e-mail, connectez-vous.
            Sinon, <Link href="/auth/verify" className="underline">renvoyez le lien de confirmation</Link>{" "}
            ou <Link href="/auth/forgot-password" className="underline">réinitialisez votre mot de passe</Link>.
          </div>
        )}

        <div className="card">
          <LoginForm />
        </div>
        <p className="text-center text-sm text-muted mt-6">
          Pas de compte ?{" "}
          <Link href="/auth/register" className="text-coral hover:underline">S&apos;inscrire</Link>
        </p>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Mail } from "lucide-react";
import { ResendConfirmation } from "@/components/auth/ResendConfirmation";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="card max-w-md w-full text-center py-10">
        <div className="w-16 h-16 rounded-full bg-coral/10 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-coral" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Vérifiez votre email</h1>
        <p className="text-muted text-sm mb-6">
          {email ? (
            <>Un lien de confirmation a été envoyé à <span className="text-white">{email}</span>.</>
          ) : (
            <>Un lien de confirmation vous a été envoyé.</>
          )}{" "}
          Cliquez dessus pour activer votre compte Moshi.
        </p>

        <ResendConfirmation initialEmail={email ?? ""} />

        <Link href="/auth/login" className="inline-block mt-6">
          <Button variant="ghost">Retour à la connexion</Button>
        </Link>
      </div>
    </div>
  );
}

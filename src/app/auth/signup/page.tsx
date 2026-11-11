import SignupForm from "@/components/auth/SignupForm";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <p className="text-3xl font-extrabold tracking-tight mb-2">Moshi</p>
          <h1 className="text-xl font-semibold">Inscription</h1>
          <p className="text-neutral-400 text-sm mt-2">
            Créez un compte pour liker, suivre et publier
          </p>
        </div>

        <SignupForm />

        <div className="mt-10 border-t border-neutral-800 pt-6 text-center">
          <p className="text-sm text-neutral-500">
            Vous avez déjà un compte ?{" "}
            <Link href="/auth/login" className="text-white font-semibold underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
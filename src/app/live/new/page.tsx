import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LiveSetupForm from "@/components/live/LiveSetupForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewLivePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/live/new");

  // Vérifier que l'utilisateur est vendeur
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "vendeur") {
    return (
      <div className="min-h-[100dvh] bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center mb-4">
          <span className="text-3xl">🔒</span>
        </div>
        <h1 className="text-xl font-bold mb-2">Accès réservé aux vendeurs</h1>
        <p className="text-sm text-neutral-400 mb-6 max-w-xs">
          Vous devez avoir un compte vendeur pour démarrer un live shopping.
        </p>
        <Link href="/boutique" className="text-red-500 font-semibold text-sm">
          Retour à la boutique
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-black/80 backdrop-blur border-b border-neutral-800">
        <Link
          href="/live"
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-800 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold">Démarrer un live</h1>
      </header>

      <main className="px-4 py-6">
        <LiveSetupForm userId={user.id} />
      </main>
    </div>
  );
}

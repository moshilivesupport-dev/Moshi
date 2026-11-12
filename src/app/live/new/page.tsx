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

  // ✅ MODIFICATION : On récupère le profil mais SANS bloquer les acheteurs
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isSeller = profile?.role === "vendeur";

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
        {/* Message d'info selon le rôle */}
        {!isSeller && (
          <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <p className="text-sm text-blue-400">
              💡 <strong>Astuce :</strong> En tant qu'acheteur, vous pouvez faire des lives pour partager vos avis, unboxings, ou discuter avec la communauté. 
              Les vendeurs ont en plus la possibilité d'épingler des produits à vendre.
            </p>
          </div>
        )}

        {/* ✅ MODIFICATION : On passe isSeller au formulaire au lieu de bloquer */}
        <LiveSetupForm userId={user.id} isSeller={isSeller} />
      </main>
    </div>
  );
}

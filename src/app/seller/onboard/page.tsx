import { OnboardingForm } from "@/components/seller/OnboardingForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SellerOnboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Devenir vendeur Moshi</h1>
        <p className="text-muted text-sm">
          4 champs seulement. Photo de profil obligatoire pour activer le streaming.
        </p>
      </div>
      <div className="card">
        <OnboardingForm userId={user.id} />
      </div>
    </div>
  );
}

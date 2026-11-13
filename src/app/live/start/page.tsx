import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LiveSetupForm from "@/components/live/LiveSetupForm";

export const dynamic = "force-dynamic";

export default async function LiveStartPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  // Récupérer le rôle depuis la table profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isSeller = profile?.role === "seller" || profile?.role === "vendeur" || profile?.role === "admin";

  return (
    <div className="min-h-[100dvh] bg-black text-white flex items-center justify-center p-4">
      <LiveSetupForm isSeller={isSeller} />
    </div>
  );
}
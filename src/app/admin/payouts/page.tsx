import { PayoutManagement } from "@/components/admin/PayoutManagement";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Banknote } from "lucide-react";

export default async function AdminPayoutsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const { data: payouts } = await supabase
    .from("withdrawals")
    .select("id, seller_id, amount, currency, status, created_at, profiles!withdrawals_seller_id_fkey(username, full_name)")
    .in("status", ["pending", "processing"])
    .order("created_at", { ascending: true });

  const mapped = (payouts || []).map((p: any) => ({
    ...p,
    seller: p.profiles,
  }));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-muted hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> Retour Admin
      </Link>
      <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
        <Banknote className="w-6 h-6 text-champagne" /> Gestion des payouts
      </h1>
      <p className="text-muted text-sm mb-8">
        Validez les retraits des vendeurs. La commission plateforme a déjà été déduite.
      </p>
      <PayoutManagement initialPayouts={mapped} />
    </div>
  );
}

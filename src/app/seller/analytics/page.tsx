import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Users, Coins, Gift, TrendingUp } from "lucide-react";

export default async function SellerAnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Demo stats – replace with real queries
  const stats = [
    { label: "Spectateurs totaux", value: "12.4K", icon: Users, color: "text-coral" },
    { label: "Pic concurrent", value: "1 842", icon: TrendingUp, color: "text-champagne" },
    { label: "Revenus (gifts)", value: "245 000 XOF", icon: Coins, color: "text-gold" },
    { label: "Gifts reçus", value: "386", icon: Gift, color: "text-coral" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">Analytics post-stream</h1>
      <p className="text-muted text-sm mb-8">Performances de vos lives</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <div key={s.label} className="card text-center">
            <s.icon className={`w-6 h-6 mx-auto mb-2 ${s.color}`} />
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="font-semibold text-white mb-4">Derniers lives</h2>
        <p className="text-sm text-muted">Connectez vos streams pour voir les détails (viewers, revenus, top produits, gifts).</p>
      </div>
    </div>
  );
}

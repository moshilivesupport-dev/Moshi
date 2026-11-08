import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency, CurrencyCode } from "@/lib/currency";
import { Package } from "lucide-react";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const { payment } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: orders } = await supabase
    .from("orders")
    .select("*, products(title)")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Package className="w-6 h-6 text-coral" /> Mes commandes
      </h1>

      {payment === "success" && (
        <div className="card mb-4 text-sm text-green-400">Paiement confirmé ✓ Votre commande est enregistrée (fonds en escrow).</div>
      )}
      {payment === "pending" && (
        <div className="card mb-4 text-sm text-champagne">Paiement en attente de confirmation. Actualisez cette page dans un instant.</div>
      )}
      {payment === "failed" && (
        <div className="card mb-4 text-sm text-red-400">Le paiement a échoué ou a été annulé. Aucun montant n&apos;a été débité.</div>
      )}

      {!orders || orders.length === 0 ? (
        <div className="card text-center py-16 text-muted">Aucune commande pour le moment.</div>
      ) : (
        <div className="space-y-3">
          {orders.map((o: any) => (
            <div key={o.id} className="card flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{o.products?.title || "Produit"}</p>
                <p className="text-xs text-muted mt-0.5">
                  {formatCurrency(o.total_amount, o.currency as CurrencyCode)} · {o.status}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                o.escrow_status === "held" ? "bg-champagne/20 text-champagne" :
                o.escrow_status === "released" ? "bg-green-500/20 text-green-400" :
                "bg-white/10 text-muted"
              }`}>
                {o.escrow_status === "held" ? "Escrow" : o.escrow_status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, ShoppingBag, Package, Loader2, ArrowRight } from "lucide-react";

export default function OrdersPage() {
  const router = useRouter();
  const supabase = createClient();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"buyer" | "seller">("buyer");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      // Récupérer le rôle
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const isSeller = profile?.role === "vendeur" || profile?.role === "seller" || profile?.role === "admin";
      setRole(isSeller ? "seller" : "buyer");

      // Charger les commandes (achetées ou reçues)
      const query = supabase
        .from("orders")
        .select(`
          id, quantity, total_price, currency, status, created_at,
          product:product_id (id, title, image_url),
          buyer:buyer_id (username, full_name),
          seller:seller_id (username, full_name)
        `)
        .order("created_at", { ascending: false });

      if (isSeller) {
        query.eq("seller_id", user.id);
      } else {
        query.eq("buyer_id", user.id);
      }

      const { data } = await query;
      setOrders(data || []);
      setLoading(false);
    };
    load();
  }, [supabase, router]);

  if (loading) {
    return <div className="min-h-[100dvh] bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 text-neutral-500 animate-spin" /></div>;
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      <header className="sticky top-0 z-30 bg-black flex items-center gap-2 px-2 py-3 border-b border-neutral-800">
        <button onClick={() => router.back()} className="p-2">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-semibold">
          {role === "seller" ? "Commandes reçues" : "Mes commandes"}
        </h1>
      </header>

      <div className="p-4">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Package className="w-12 h-12 text-neutral-700" />
            <p className="text-neutral-500 text-sm">
              {role === "seller" ? "Aucune commande pour le moment" : "Tu n'as encore rien acheté"}
            </p>
            <Link href="/shop" className="text-red-500 font-semibold text-sm">
              Visiter la boutique
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const product = Array.isArray(order.product) ? order.product[0] : order.product;
              const buyer = Array.isArray(order.buyer) ? order.buyer[0] : order.buyer;
              const seller = Array.isArray(order.seller) ? order.seller[0] : order.seller;

              return (
                <div key={order.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-3">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-16 h-16 rounded-lg bg-neutral-800 overflow-hidden flex-shrink-0">
                      {product?.image_url ? (
                        <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-6 h-6 text-neutral-600 m-auto mt-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{product?.title || "Produit"}</p>
                      <p className="text-xs text-neutral-400">Quantité: {order.quantity}</p>
                      <p className="text-sm font-bold text-green-400">
                        {Number(order.total_price).toFixed(2)} {order.currency}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        order.status === "pending" ? "bg-yellow-500/20 text-yellow-500" :
                        order.status === "paid" ? "bg-blue-500/20 text-blue-500" :
                        order.status === "shipped" ? "bg-purple-500/20 text-purple-500" :
                        order.status === "delivered" ? "bg-green-500/20 text-green-500" :
                        "bg-red-500/20 text-red-500"
                      }`}>
                        {order.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-neutral-500 pt-2 border-t border-neutral-800">
                    <span>{new Date(order.created_at).toLocaleDateString("fr-FR")}</span>
                    <ArrowRight className="w-3 h-3 mx-1" />
                    <span>
                      {role === "seller" 
                        ? `Acheteur: @${buyer?.username || "user"}` 
                        : `Vendeur: @${seller?.username || "user"}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
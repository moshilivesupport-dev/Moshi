"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Package, Loader2, CheckCircle, Truck, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  buyer_id: string;
  product: {
    id: string;
    title: string;
    image_url: string | null;
  } | null;
  buyer: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

const TABS = [
  { id: "pending", label: "En attente", icon: Clock, color: "text-yellow-500" },
  { id: "paid", label: "Payé", icon: CheckCircle, color: "text-blue-500" },
  { id: "shipped", label: "Expédié", icon: Truck, color: "text-purple-500" },
  { id: "delivered", label: "Livré", icon: CheckCircle, color: "text-green-500" },
];

export default function SellerOrdersPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      // Charger les commandes du vendeur
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, total_amount, status, created_at, buyer_id, product_id")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (ordersData) {
        // Charger les produits et les acheteurs
        const productIds = [...new Set(ordersData.map(o => o.product_id))];
        const buyerIds = [...new Set(ordersData.map(o => o.buyer_id))];

        const { data: productsData } = await supabase.from("products").select("id, title, image_url").in("id", productIds);
        const { data: buyersData } = await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", buyerIds);

        const productsMap: Record<string, any> = {};
        (productsData || []).forEach(p => { productsMap[p.id] = p; });
        const buyersMap: Record<string, any> = {};
        (buyersData || []).forEach(b => { buyersMap[b.id] = b; });

        const merged: Order[] = ordersData.map(o => ({
          ...o,
          product: productsMap[o.product_id] || null,
          buyer: buyersMap[o.buyer_id] || null,
        }));

        setOrders(merged);
      }
      setLoading(false);
    };
    loadOrders();
  }, [supabase, router]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);

    if (!error) {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } else {
      alert("Erreur : " + error.message);
    }
    setUpdatingId(null);
  };

  const filteredOrders = orders.filter(o => o.status === activeTab);

  if (loading) return <div className="min-h-[100dvh] flex items-center justify-center"><Loader2 className="w-10 h-10 text-moshi-purple animate-spin" /></div>;

  return (
    <div className="min-h-[100dvh] bg-moshi-bg pb-10">
      
      <header className="px-4 py-4 flex items-center bg-white shadow-sm sticky top-0 z-20">
        <button onClick={() => router.back()} className="p-2"><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold ml-2">Mes Commandes</h1>
      </header>

      {/* ONGLETS */}
      <div className="flex border-b border-gray-200 bg-white sticky top-[64px] z-10">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const count = orders.filter(o => o.status === tab.id).length;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 border-b-2 transition-colors",
                isActive ? "border-moshi-purple" : "border-transparent"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-moshi-purple" : "text-gray-400")} />
              <span className={cn("text-[10px] font-bold", isActive ? "text-moshi-purple" : "text-gray-400")}>
                {tab.label}
              </span>
              {count > 0 && (
                <span className="absolute -top-1 right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 rounded-full">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-4 max-w-md mx-auto space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Package className="w-12 h-12 text-gray-300" />
            <p className="text-sm text-gray-500">Aucune commande {TABS.find(t => t.id === activeTab)?.label.toLowerCase()}.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const buyerName = order.buyer?.username || order.buyer?.full_name || "Client";
            return (
              <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                
                {/* Produit */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                    {order.product?.image_url ? (
                      <Image src={order.product.image_url} alt={order.product.title} width={56} height={56} className="w-full h-full object-cover" unoptimized />
                    ) : (
                      <Package className="m-auto text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{order.product?.title || "Produit supprimé"}</p>
                    <p className="text-sm font-extrabold text-moshi-purple mt-0.5">{order.total_amount.toLocaleString()} FCFA</p>
                  </div>
                </div>

                {/* Acheteur */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden shrink-0">
                    {order.buyer?.avatar_url ? (
                      <Image src={order.buyer.avatar_url} alt={buyerName} width={32} height={32} className="w-full h-full object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-moshi-purple">{buyerName.charAt(0)}</div>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-gray-600">@{buyerName}</p>
                  <span className="ml-auto text-[10px] text-gray-400">
                    {new Date(order.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>

                {/* Actions selon le statut */}
                <div className="flex gap-2 pt-2">
                  {order.status === "pending" && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, "paid")}
                      disabled={updatingId === order.id}
                      className="flex-1 bg-blue-500 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1"
                    >
                      {updatingId === order.id ? <Loader2 className="animate-spin" size={14} /> : <><CheckCircle size={14} /> Marquer payé</>}
                    </button>
                  )}
                  {order.status === "paid" && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, "shipped")}
                      disabled={updatingId === order.id}
                      className="flex-1 bg-purple-500 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1"
                    >
                      {updatingId === order.id ? <Loader2 className="animate-spin" size={14} /> : <><Truck size={14} /> Marquer expédié</>}
                    </button>
                  )}
                  {order.status === "shipped" && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, "delivered")}
                      disabled={updatingId === order.id}
                      className="flex-1 bg-green-500 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1"
                    >
                      {updatingId === order.id ? <Loader2 className="animate-spin" size={14} /> : <><CheckCircle size={14} /> Marquer livré</>}
                    </button>
                  )}
                  {order.status !== "delivered" && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, "cancelled")}
                      disabled={updatingId === order.id}
                      className="px-3 bg-red-50 text-red-500 text-xs font-bold rounded-lg"
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
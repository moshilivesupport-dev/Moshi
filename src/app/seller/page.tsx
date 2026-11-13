"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Plus, ShoppingBag, Package, TrendingUp, Loader2, Edit, Trash2 } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export default function SellerDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalProducts: 0, totalOrders: 0, totalRevenue: 0 });

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      setProducts(productsData || []);
      setStats({
        totalProducts: productsData?.length || 0,
        totalOrders: 0,
        totalRevenue: 0,
      });
      setLoading(false);
    };
    load();
  }, [supabase, router]);

  const deleteProduct = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return;
    await supabase.from("products").delete().eq("id", id);
    setProducts(products.filter((p) => p.id !== id));
  };

  if (loading) {
    return <div className="min-h-[100dvh] bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 text-neutral-500 animate-spin" /></div>;
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      <header className="px-4 py-4 flex items-center justify-between border-b border-neutral-800">
        <h1 className="text-xl font-bold">Mon Dashboard Vendeur</h1>
        <Link href="/seller/products/new" className="bg-purple-600 text-white text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-1">
          <Plus className="w-4 h-4" /> Ajouter
        </Link>
      </header>

      {/* Statistiques */}
      <div className="grid grid-cols-3 gap-2 p-4">
        <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800">
          <Package className="w-5 h-5 text-blue-400 mb-2" />
          <p className="text-2xl font-bold">{stats.totalProducts}</p>
          <p className="text-[10px] text-neutral-400">Produits</p>
        </div>
        <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800">
          <ShoppingBag className="w-5 h-5 text-green-400 mb-2" />
          <p className="text-2xl font-bold">{stats.totalOrders}</p>
          <p className="text-[10px] text-neutral-400">Commandes</p>
        </div>
        <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800">
          <TrendingUp className="w-5 h-5 text-purple-400 mb-2" />
          <p className="text-2xl font-bold">{stats.totalRevenue}€</p>
          <p className="text-[10px] text-neutral-400">Revenus</p>
        </div>
      </div>

      {/* Liste des produits */}
      <div className="px-4">
        <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3 mt-4">
          Mes produits ({products.length})
        </h2>
        {products.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm mb-3">Aucun produit en vente</p>
            <Link href="/seller/products/new" className="text-purple-400 font-semibold text-sm">
              Ajouter mon premier produit
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((product) => (
              <div key={product.id} className="bg-neutral-900 rounded-xl p-3 flex items-center gap-3 border border-neutral-800">
                <div className="w-14 h-14 rounded-lg bg-neutral-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingBag className="w-6 h-6 text-neutral-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{product.title}</p>
                  <p className="text-xs text-green-400 font-bold">{Number(product.price).toFixed(2)} {product.currency || "€"}</p>
                  <p className="text-[10px] text-neutral-500">Stock: {product.stock || 0}</p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/seller/products/${product.id}/edit`} className="p-2 bg-neutral-800 rounded-lg">
                    <Edit className="w-4 h-4 text-white" />
                  </Link>
                  <button onClick={() => deleteProduct(product.id)} className="p-2 bg-red-500/20 rounded-lg">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
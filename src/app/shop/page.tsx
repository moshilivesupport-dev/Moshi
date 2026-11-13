"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Search, ShoppingBag, Loader2, Star, Sparkles } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export default function ShopPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      
      // ✅ On charge TOUS les produits actifs, peu importe le vendeur
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, title, price, currency, image_url, is_featured, stock,
          profiles:seller_id (username, full_name, avatar_url)
        `)
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur chargement produits:", error);
      } else {
        setProducts(data || []);
      }
      setLoading(false);
    };
    
    loadProducts();
  }, [supabase]);

  // Filtrer par recherche
  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      {/* Header avec recherche */}
      <header className="sticky top-0 z-30 bg-black px-4 py-3 border-b border-neutral-800">
        <h1 className="text-2xl font-bold mb-3">Boutique</h1>
        <div className="flex items-center bg-neutral-900 rounded-full px-4 py-2">
          <Search className="w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-white text-sm ml-2 outline-none placeholder:text-neutral-500"
          />
        </div>
      </header>

      {/* Grille de produits */}
      <div className="p-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <ShoppingBag className="w-12 h-12 text-neutral-700" />
            <p className="text-neutral-500 text-sm">Aucun produit trouvé</p>
            <p className="text-neutral-600 text-xs text-center px-6">
              Les produits des vendeurs apparaîtront ici dès qu'ils seront publiés.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => {
              const seller = Array.isArray(product.profiles) ? product.profiles[0] : product.profiles;
              return (
                <Link
                  key={product.id}
                  href={`/shop/${product.id}`}
                  className="bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 active:scale-[0.98] transition-transform"
                >
                  {/* Image */}
                  <div className="aspect-square bg-neutral-800 flex items-center justify-center relative overflow-hidden">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.title} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <ShoppingBag className="w-12 h-12 text-neutral-700" />
                    )}
                    
                    {/* Badge mis en avant */}
                    {product.is_featured && (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> TOP
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="p-3">
                    <p className="text-sm font-semibold text-white truncate">{product.title}</p>
                    <p className="text-base font-bold text-green-400 mt-1">
                      {Number(product.price).toFixed(2)} {product.currency || "€"}
                    </p>
                    
                    {/* Vendeur */}
                    {seller && (
                      <div className="flex items-center gap-1 mt-2">
                        <div className="w-4 h-4 rounded-full bg-neutral-700 overflow-hidden">
                          {seller.avatar_url && <img src={seller.avatar_url} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <p className="text-[10px] text-neutral-400 truncate">
                          @{seller.username || "vendeur"}
                        </p>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
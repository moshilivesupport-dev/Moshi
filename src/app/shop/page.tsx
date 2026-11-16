"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Package, Loader2, ArrowLeft, Search } from "lucide-react";

interface Product {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
  category: string | null;
}

export default function ShopPage() {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, price, image_url, category")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      setProducts(data || []);
      setLoading(false);
    };
    load();
  }, [supabase]);

  const filtered = products.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-[100dvh] bg-moshi-bg pb-24">
      
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link href="/" className="p-1"><ArrowLeft className="w-6 h-6" /></Link>
          <h1 className="text-lg font-bold flex-1">Boutique</h1>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Rechercher un produit..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 text-sm outline-none" />
          </div>
        </div>
      </header>

      <div className="p-4 max-w-md mx-auto">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-moshi-purple animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Package className="w-12 h-12 text-gray-300" />
            <p className="text-sm text-gray-500">Aucun produit disponible.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((p) => (
              <Link href={`/shop/${p.id}`} key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="aspect-square bg-gray-100 relative">
                  {p.image_url ? (
                    <Image src={p.image_url} alt={p.title} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={32} /></div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold truncate">{p.title}</p>
                  {p.category && <p className="text-[10px] text-gray-400">{p.category}</p>}
                  <p className="text-sm font-extrabold text-moshi-purple mt-1">{p.price.toLocaleString()} FCFA</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
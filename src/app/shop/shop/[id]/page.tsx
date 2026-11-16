"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, ShoppingBag, Loader2, Package } from "lucide-react";

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  stock: number;
  category: string | null;
  seller_id: string;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("products").select("*").eq("id", id).single();
      setProduct(data);
      setLoading(false);
    };
    if (id) load();
  }, [id, supabase]);

  const handleBuy = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }
    setBuying(true);
    try {
      const { error } = await supabase.from("orders").insert({
        buyer_id: user.id,
        product_id: product?.id,
        seller_id: product?.seller_id,
        total_amount: product?.price,
        status: "pending",
      });
      if (error) throw error;
      alert("Commande passée ! Le vendeur va te contacter.");
      router.push("/");
    } catch (err: any) {
      alert("Erreur : " + err.message + "\n(La table 'orders' doit être créée sur Supabase).");
    } finally {
      setBuying(false);
    }
  };

  if (loading) return <div className="min-h-[100dvh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-moshi-purple" /></div>;
  if (!product) return <div className="min-h-[100dvh] flex items-center justify-center">Produit introuvable</div>;

  return (
    <div className="min-h-[100dvh] bg-moshi-bg pb-32">
      <header className="absolute top-0 left-0 right-0 z-20 p-4">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-md">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </header>

      <div className="aspect-square w-full bg-white relative">
        {product.image_url ? (
          <Image src={product.image_url} alt={product.title} fill className="object-cover" unoptimized priority />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={64} /></div>
        )}
      </div>

      <div className="p-6">
        {product.category && <p className="text-xs font-bold text-moshi-purple uppercase tracking-wider mb-1">{product.category}</p>}
        <h1 className="text-2xl font-extrabold text-moshi-text mb-2">{product.title}</h1>
        <p className="text-3xl font-extrabold text-moshi-purple mb-4">{product.price.toLocaleString()} FCFA</p>
        <p className="text-sm text-gray-500 mb-6">Stock disponible : {product.stock}</p>
        {product.description && (
          <>
            <h2 className="text-sm font-bold mb-2">Description</h2>
            <p className="text-sm text-gray-600 whitespace-pre-line mb-6">{product.description}</p>
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 pb-safe">
        <button onClick={handleBuy} disabled={buying || product.stock === 0} className="w-full moshi-gradient text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
          {buying ? <Loader2 className="animate-spin" /> : <><ShoppingBag size={20} /> {product.stock > 0 ? "Acheter maintenant" : "Rupture de stock"}</>}
        </button>
      </div>
    </div>
  );
}
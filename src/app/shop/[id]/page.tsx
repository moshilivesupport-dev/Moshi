"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft, ShoppingBag, Star, Shield, Truck, Loader2, Minus, Plus, User
} from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const productId = params.id as string;

  const [product, setProduct] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, title, description, price, currency, image_url, stock, is_featured, seller_id,
          profiles:seller_id (id, username, full_name, avatar_url)
        `)
        .eq("id", productId)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }

      setProduct(data);
      setSeller(Array.isArray(data.profiles) ? data.profiles[0] : data.profiles);
      setLoading(false);
    };
    load();
  }, [productId, supabase]);

  const handleBuy = async () => {
    setBuying(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const totalPrice = Number(product.price) * quantity;
      
      const { error } = await supabase.from("orders").insert({
        buyer_id: user.id,
        seller_id: product.seller_id,
        product_id: product.id,
        quantity,
        total_price: totalPrice,
        currency: product.currency || "EUR",
        status: "pending",
      });

      if (error) throw error;

      // ✅ Créer une notification pour le vendeur
      await fetch("/api/notifications/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: product.seller_id,
          actorId: user.id,
          type: "order",
          message: `a passé une commande pour "${product.title}" (${quantity}x) !`,
        }),
      });

      router.push("/orders?success=true");
    } catch (err) {
      alert("Erreur lors de la commande.");
      setBuying(false);
    }
  };

  if (loading) {
    return <div className="min-h-[100dvh] bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 text-neutral-500 animate-spin" /></div>;
  }

  if (!product) {
    return (
      <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center gap-4 text-white px-6">
        <ShoppingBag className="w-12 h-12 text-neutral-700" />
        <p className="font-semibold">Produit introuvable</p>
        <button onClick={() => router.push("/shop")} className="px-6 py-2 bg-white text-black rounded-full font-semibold text-sm">
          Retour à la boutique
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-24">
      <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-md flex items-center gap-2 px-4 py-3">
        <button onClick={() => router.back()} className="p-2">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-semibold">Détail du produit</h1>
      </header>

      <div className="relative aspect-square bg-neutral-900">
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-20 h-20 text-neutral-700" />
          </div>
        )}
        {product.is_featured && (
          <div className="absolute top-4 right-4 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3 fill-black" /> PRODUIT VEDETTE
          </div>
        )}
      </div>

      <div className="p-4">
        <h2 className="text-xl font-bold mb-2">{product.title}</h2>
        <p className="text-3xl font-bold text-green-400 mb-4">
          {Number(product.price).toFixed(2)} {product.currency || "€"}
        </p>

        {seller && (
          <Link href={`/profile/${seller.id}`} className="flex items-center gap-2 mb-4 bg-neutral-900 p-3 rounded-xl border border-neutral-800">
            <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0">
              {seller.avatar_url ? (
                <img src={seller.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-neutral-500 m-auto mt-2.5" />
              )}
            </div>
            <div>
              <p className="text-[10px] text-neutral-500">Vendu par</p>
              <p className="text-sm font-semibold">@{seller.username || "vendeur"}</p>
            </div>
          </Link>
        )}

        <div className="flex gap-2 mb-4">
          <div className="flex-1 bg-neutral-900 p-3 rounded-xl border border-neutral-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-400" />
            <span className="text-[10px] text-neutral-300">Paiement sécurisé</span>
          </div>
          <div className="flex-1 bg-neutral-900 p-3 rounded-xl border border-neutral-800 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-400" />
            <span className="text-[10px] text-neutral-300">Livraison rapide</span>
          </div>
        </div>

        {product.description && (
          <div className="mb-4">
            <h3 className="text-sm font-bold text-neutral-400 uppercase mb-2">Description</h3>
            <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">{product.description}</p>
          </div>
        )}

        <p className="text-xs text-neutral-500 mb-4">
          {product.stock > 0 ? `${product.stock} en stock` : "Rupture de stock"}
        </p>
      </div>

      <div className="fixed bottom-16 left-0 right-0 z-30 bg-black border-t border-neutral-800 p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-neutral-900 rounded-xl px-2 py-2 border border-neutral-700">
            <button 
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="p-1 text-white"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-white font-semibold w-6 text-center">{quantity}</span>
            <button 
              onClick={() => setQuantity(quantity + 1)}
              className="p-1 text-white"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleBuy}
            disabled={buying || product.stock === 0}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-neutral-700 disabled:text-neutral-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
          >
            {buying ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ShoppingBag className="w-5 h-5" /> Acheter
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
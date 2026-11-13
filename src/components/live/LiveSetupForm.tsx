"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Radio, ShoppingBag, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  title: string;
  price: number;
  currency: string | null;
}

interface LiveSetupFormProps {
  isSeller: boolean;
}

export default function LiveSetupForm({ isSeller }: LiveSetupFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSeller) return;
    const loadProducts = async () => {
      setLoadingProducts(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("products")
        .select("id, title, price, currency")
        .eq("seller_id", user.id)
        .eq("is_active", true)
        .limit(20);

      setProducts(data || []);
      setLoadingProducts(false);
    };
    loadProducts();
  }, [isSeller, supabase]);

  const toggleProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleStart = async () => {
    if (!title.trim()) {
      setError("Ajoute un titre à ton live.");
      return;
    }
    if (isSeller && selectedProducts.length === 0) {
      setError("Sélectionne au moins un produit à vendre.");
      return;
    }

    setStarting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      // 🆕 C'EST ICI QUE TOUT SE JOUE
      const { data: liveData, error: liveError } = await supabase
        .from("live_sessions")
        .insert({
          host_id: user.id,
          title: title.trim(),
          host_role: isSeller ? "vendeur" : "acheteur",
          status: "live",
          viewers_count: 0,
          product_ids: isSeller ? selectedProducts : [],
          // 👇 CES 2 LIGNES SONT NOUVELLES 👇
          room_name: `moshi-live-${crypto.randomUUID()}`, // Génère un nom unique (ex: moshi-live-a1b2-c3d4)
          provider: "livekit", // Dit à l'app d'utiliser LiveKit
          // 👆 FIN DES NOUVELLES LIGNES 👆
        })
        .select()
        .single();

      if (liveError) throw liveError;

      // Si vendeur, lier les produits au live
      if (isSeller && selectedProducts.length > 0) {
        const productLinks = selectedProducts.map((productId) => ({
          live_id: liveData.id,
          product_id: productId,
          is_pinned: true,
        }));

        const { error: productsError } = await supabase
          .from("live_products")
          .insert(productLinks);

        if (productsError) {
          console.warn("Erreur liaison produits:", productsError);
        }
      }

      // Rediriger vers la salle de live (LiveKit s'occupera du reste)
      router.push(`/live/${liveData.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors du lancement";
      setError(message);
      setStarting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-neutral-900 rounded-2xl border border-neutral-800">
      <div className="flex items-center gap-3 mb-6">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          isSeller ? "bg-purple-600" : "bg-red-500"
        )}>
          {isSeller ? <ShoppingBag className="w-5 h-5 text-white" /> : <Radio className="w-5 h-5 text-white" />}
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">
            {isSeller ? "Lancer un Live Shopping" : "Lancer un Live"}
          </h2>
          <p className="text-xs text-neutral-400">
            {isSeller ? "Vends tes produits en direct" : "Partage un moment avec ta communauté"}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-neutral-400 mb-2">Titre du live</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder={isSeller ? "Ex: Nouvelle collection printemps" : "Ex: Je réponds à vos questions"}
          className="w-full bg-black border border-neutral-800 rounded-lg p-3 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none"
        />
      </div>

      {isSeller && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-neutral-400 mb-2">
            Produits à épingler ({selectedProducts.length})
          </label>

          {loadingProducts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="bg-black border border-neutral-800 rounded-lg p-4 text-center">
              <ShoppingBag className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              <p className="text-sm text-neutral-400 mb-2">Aucun produit en vente</p>
              <button
                onClick={() => router.push("/seller/products/new")}
                className="text-red-500 text-sm font-semibold"
              >
                + Ajouter un produit
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {products.map((product) => {
                const isSelected = selectedProducts.includes(product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => toggleProduct(product.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2 rounded-lg border text-left transition",
                      isSelected ? "bg-purple-600/20 border-purple-500" : "bg-black border-neutral-800"
                    )}
                  >
                    <div className="w-12 h-12 rounded-lg bg-neutral-800 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-5 h-5 text-neutral-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{product.title}</p>
                      <p className="text-xs text-neutral-400">
                        {product.price.toFixed(2)} {product.currency || "€"}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleStart}
        disabled={starting || !title.trim()}
        className={cn(
          "w-full py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50",
          isSeller ? "bg-purple-600 hover:bg-purple-700" : "bg-red-500 hover:bg-red-600"
        )}
      >
        {starting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Lancement...
          </>
        ) : (
          <>
            {isSeller ? <ShoppingBag className="w-5 h-5" /> : <Radio className="w-5 h-5" />}
            {isSeller ? "Lancer le Live Shopping" : "Lancer le Live"}
          </>
        )}
      </button>
    </div>
  );
}
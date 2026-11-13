"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ShoppingBag, Loader2, Radio } from "lucide-react";

export default function LiveSetupForm({ isSeller }: { isSeller: boolean }) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!isSeller) return;
    const fetchProducts = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("products").select("*").eq("seller_id", user.id).eq("is_active", true);
        setProducts(data || []);
      }
      setLoading(false);
    };
    fetchProducts();
  }, [isSeller, supabase]);

  const handleStart = async () => {
    if (!title) return alert("Ajoute un titre");
    if (isSeller && selectedProducts.length === 0) return alert("Sélectionne au moins un produit");
    
    setStarting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Créer la session live
    const { data: live, error } = await supabase.from("live_sessions").insert({
      host_id: user.id,
      title,
      host_role: isSeller ? "vendeur" : "acheteur",
      status: "live",
      room_name: `moshi-${Date.now()}`,
      product_ids: selectedProducts // On stocke les IDs des produits
    }).select().single();

    if (!error && live) {
      router.push(`/live/${live.id}`);
    } else {
      alert("Erreur lors du lancement");
      setStarting(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-neutral-900 rounded-2xl border border-neutral-800">
      <h2 className="text-2xl font-bold text-white mb-6">
        {isSeller ? "Live Shopping" : "Lancer un Live"}
      </h2>

      <input
        type="text"
        placeholder="Titre du live"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full bg-black border border-neutral-700 text-white p-3 rounded-lg mb-4"
      />

      {isSeller && (
        <div className="mb-6">
          <p className="text-neutral-400 text-sm mb-2">Sélectionne tes produits :</p>
          {loading ? <p className="text-white">Chargement...</p> : (
            <div className="max-h-40 overflow-y-auto space-y-2">
              {products.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => setSelectedProducts(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                  className={`p-2 rounded cursor-pointer border ${selectedProducts.includes(p.id) ? 'bg-purple-900/50 border-purple-500' : 'bg-black border-neutral-800'}`}
                >
                  <p className="text-white text-sm">{p.title}</p>
                  <p className="text-green-400 text-xs">{p.price} €</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleStart}
        disabled={starting}
        className="w-full bg-purple-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
      >
        {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSeller ? <ShoppingBag className="w-5 h-5" /> : <Radio className="w-5 h-5" />)}
        Lancer
      </button>
    </div>
  );
}
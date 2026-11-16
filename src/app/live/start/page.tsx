"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Radio, Loader2, Package } from "lucide-react";
import Image from "next/image";

export default function StartLivePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "simple"; // 'simple' ou 'vendeur'
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      setRole(profile?.role || "acheteur");

      // Si on est en mode vendeur mais que le rôle est acheteur, on bloque
      if (mode === "vendeur" && profile?.role !== "vendeur") {
        alert("Cette option est réservée aux vendeurs.");
        router.push("/");
        return;
      }

      // Charger les produits seulement si vendeur
      if (profile?.role === "vendeur") {
        const { data: prodData } = await supabase.from("products").select("id, title, price, image_url").eq("seller_id", user.id);
        setProducts(prodData || []);
      }
      setLoading(false);
    };
    init();
  }, [supabase, router, mode]);

  const handleStart = async () => {
    if (!userId || !title) return;
    setStarting(true);

    const { data, error } = await supabase.from("lives").insert({
      host_id: userId,
      title,
      description,
      product_id: selectedProduct,
      status: "live",
      mode: mode,
      viewer_count: 1,
    }).select().single();

    if (error) {
      alert("Erreur : " + error.message);
      setStarting(false);
    } else {
      router.push(`/live/${data.id}`);
    }
  };

  if (loading) return <div className="min-h-[100dvh] flex items-center justify-center"><Loader2 className="w-10 h-10 text-moshi-purple animate-spin" /></div>;

  return (
    <div className="min-h-[100dvh] bg-moshi-bg pb-32">
      <header className="px-4 py-4 flex items-center justify-between bg-white shadow-sm sticky top-0 z-20">
        <button onClick={() => router.back()} className="p-2"><ArrowLeft className="w-6 h-6" /></button>
        <h1 className="text-lg font-bold">{mode === "vendeur" ? "Live Vendeur" : "Live Simple"}</h1>
        <div className="w-10" />
      </header>

      <div className="p-6 max-w-md mx-auto space-y-4">
        
        <div>
          <label className="text-xs font-bold text-gray-500 ml-1">Titre du live</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Nouvelle collection d'été" className="w-full mt-1 px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium" />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 ml-1">Description (optionnel)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Décris ce que tu vas présenter..." className="w-full mt-1 px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium resize-none" />
        </div>

        {/* PRODUIT ÉPINGLÉ (vendeur uniquement) */}
        {role === "vendeur" && (
          <div>
            <label className="text-xs font-bold text-gray-500 ml-1 mb-2 block">Épingler un produit</label>
            {products.length === 0 ? (
              <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-3 text-sm text-gray-500">
                <Package size={20} className="text-gray-400" />
                Aucun produit dans ta boutique.
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {products.map((p) => (
                  <button key={p.id} onClick={() => setSelectedProduct(selectedProduct === p.id ? null : p.id)} className={`min-w-[140px] p-2 rounded-xl border-2 transition-all text-left ${selectedProduct === p.id ? "border-moshi-purple bg-purple-50" : "border-gray-200 bg-white"}`}>
                    <div className="w-full h-20 rounded-lg overflow-hidden bg-gray-100 mb-2 relative">
                      {p.image_url ? <Image src={p.image_url} alt={p.title} fill className="object-cover" unoptimized /> : <Package className="absolute inset-0 m-auto text-gray-300" />}
                    </div>
                    <p className="text-xs font-bold truncate">{p.title}</p>
                    <p className="text-[10px] text-moshi-purple font-extrabold">{p.price.toLocaleString()} FCFA</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 pb-safe">
        <button onClick={handleStart} disabled={starting || !title} className="w-full bg-red-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-200/50 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2">
          {starting ? <Loader2 className="animate-spin" /> : <><Radio size={20} /> Lancer le Live</>}
        </button>
      </div>
    </div>
  );
}
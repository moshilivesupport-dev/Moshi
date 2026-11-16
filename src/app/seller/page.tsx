"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Plus, Package, Loader2, X, ArrowLeft, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
  stock: number;
  status: string;
}

export default function SellerDashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isVendeur, setIsVendeur] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Formulaire
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);

      // Vérifier si c'est un vendeur
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "vendeur") {
        alert("Tu dois être vendeur pour accéder à cette page.");
        router.push("/");
        return;
      }
      setIsVendeur(true);

      // Charger les produits
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });
      setProducts(data || []);
      setLoading(false);
    };
    loadData();
  }, [supabase, router]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("products")
        .getPublicUrl(filePath);
      setImageUrl(publicUrl);
    } catch (err: any) {
      alert("Erreur upload : " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!userId || !title || !price) return;
    setSaving(true);

    const { error } = await supabase.from("products").insert({
      seller_id: userId,
      title,
      description,
      price: parseFloat(price),
      stock: parseInt(stock),
      category,
      image_url: imageUrl,
    });

    if (error) {
      alert("Erreur : " + error.message);
    } else {
      // Reset
      setTitle(""); setDescription(""); setPrice(""); setStock("1"); setCategory(""); setImageUrl(null);
      setShowForm(false);
      // Recharger
      const { data } = await supabase.from("products").select("*").eq("seller_id", userId).order("created_at", { ascending: false });
      setProducts(data || []);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return;
    await supabase.from("products").delete().eq("id", id);
    setProducts(products.filter((p) => p.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-moshi-bg">
        <Loader2 className="w-10 h-10 text-moshi-purple animate-spin" />
      </div>
    );
  }

  if (!isVendeur) return null;

  return (
    <div className="min-h-[100dvh] bg-moshi-bg pb-24">
      
      <header className="px-4 py-4 flex items-center justify-between bg-white shadow-sm">
        <Link href="/" className="p-2"><ArrowLeft className="w-6 h-6" /></Link>
        <h1 className="text-lg font-bold">Ma Boutique</h1>
        <button onClick={() => setShowForm(true)} className="w-9 h-9 rounded-full moshi-gradient flex items-center justify-center text-white">
          <Plus size={20} />
        </button>
      </header>

      <div className="p-4 max-w-md mx-auto">
        {/* Liste des produits */}
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Package className="w-12 h-12 text-gray-300" />
            <p className="text-sm text-gray-500">Tu n'as pas encore de produits.</p>
            <button onClick={() => setShowForm(true)} className="moshi-gradient text-white px-6 py-3 rounded-full font-bold">
              Ajouter mon premier produit
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="aspect-square bg-gray-100 relative">
                  {p.image_url ? (
                    <Image src={p.image_url} alt={p.title} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={32} /></div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold truncate">{p.title}</p>
                  <p className="text-sm font-extrabold text-moshi-purple mt-1">{p.price.toLocaleString()} FCFA</p>
                  <p className="text-[10px] text-gray-400 mt-1">Stock: {p.stock}</p>
                </div>
                <button onClick={() => handleDelete(p.id)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Ajout Produit */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 max-h-[90dvh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Nouveau produit</h2>
              <button onClick={() => setShowForm(false)} className="p-2"><X size={20} /></button>
            </div>

            <div className="space-y-3">
              {/* Image */}
              <div className="relative w-full aspect-square rounded-2xl bg-gray-100 overflow-hidden mb-2">
                {imageUrl ? (
                  <Image src={imageUrl} alt="Preview" fill className="object-cover" unoptimized />
                ) : (
                  <button onClick={() => fileInputRef.current?.click()} className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400">
                    {uploading ? <Loader2 className="animate-spin" /> : <><Plus size={32} /><span className="text-xs">Ajouter une image</span></>}
                  </button>
                )}
                {imageUrl && (
                  <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-2 right-2 bg-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-md">
                    Changer
                  </button>
                )}
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
              </div>

              <input type="text" placeholder="Nom du produit" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none text-sm" />
              <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none text-sm resize-none" />
              
              <div className="flex gap-2">
                <input type="number" placeholder="Prix (FCFA)" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none text-sm" />
                <input type="number" placeholder="Stock" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none text-sm" />
              </div>

              <input type="text" placeholder="Catégorie (ex: Mode, Beauté)" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none text-sm" />

              <button onClick={handleSave} disabled={saving || !title || !price} className="w-full moshi-gradient text-white font-bold py-3.5 rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
                {saving ? <Loader2 className="animate-spin" /> : "Publier le produit"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
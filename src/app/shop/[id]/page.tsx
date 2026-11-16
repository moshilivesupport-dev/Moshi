"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, ShoppingBag, Loader2, Package, Pencil, Trash2, Check, X } from "lucide-react";
import { getFlag } from "@/lib/utils";

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

interface SellerProfile {
  username: string | null;
  full_name: string | null;
  country: string | null;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [product, setProduct] = useState<Product | null>(null);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);

  // Mode édition
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editImage, setEditImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data } = await supabase.from("products").select("*").eq("id", id).single();
      if (data) {
        setProduct(data);
        setIsOwner(user?.id === data.seller_id);
        setEditTitle(data.title);
        setEditDescription(data.description || "");
        setEditPrice(data.price.toString());
        setEditStock(data.stock.toString());
        setEditImage(data.image_url);

        // Charger le profil du vendeur (avec le pays)
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, full_name, country")
          .eq("id", data.seller_id)
          .single();
        setSellerProfile(profile);
      }
      setLoading(false);
    };
    if (id) load();
  }, [id, supabase]);

  const handleBuy = async () => {
    if (!currentUser) { router.push("/auth/login"); return; }
    setBuying(true);
    try {
      const { error } = await supabase.from("orders").insert({
        buyer_id: currentUser.id,
        product_id: product?.id,
        seller_id: product?.seller_id,
        total_amount: product?.price,
        status: "pending",
      });
      if (error) throw error;
      alert("Commande passée ! Le vendeur va te contacter.");
      router.push("/");
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setBuying(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer ce produit définitivement ?")) return;
    const { error } = await supabase.from("products").delete().eq("id", product?.id);
    if (error) { alert(error.message); return; }
    router.push("/shop");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${currentUser.id}/${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from("products").upload(filePath, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("products").getPublicUrl(filePath);
      setEditImage(publicUrl);
    } catch (err: any) {
      alert("Erreur upload : " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("products").update({
      title: editTitle,
      description: editDescription,
      price: parseFloat(editPrice),
      stock: parseInt(editStock),
      image_url: editImage,
    }).eq("id", product?.id);

    if (error) {
      alert("Erreur : " + error.message);
    } else {
      setProduct({
        ...product!,
        title: editTitle,
        description: editDescription,
        price: parseFloat(editPrice),
        stock: parseInt(editStock),
        image_url: editImage,
      });
      setIsEditing(false);
    }
    setSaving(false);
  };

  if (loading) return <div className="min-h-[100dvh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-moshi-purple" /></div>;
  if (!product) return <div className="min-h-[100dvh] flex items-center justify-center">Produit introuvable</div>;

  return (
    <div className="min-h-[100dvh] bg-moshi-bg pb-32">
      <header className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-md">
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        {isOwner && !isEditing && (
          <div className="flex gap-2">
            <button onClick={() => setIsEditing(true)} className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-md text-moshi-purple">
              <Pencil className="w-5 h-5" />
            </button>
            <button onClick={handleDelete} className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-md text-red-500">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
      </header>

      <div className="aspect-square w-full bg-white relative">
        {isEditing ? (
          <>
            {editImage ? (
              <Image src={editImage} alt="Preview" fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={64} /></div>
            )}
            <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-4 right-4 bg-white px-3 py-2 rounded-full text-xs font-semibold shadow-md">
              {uploading ? "Upload..." : "Changer l'image"}
            </button>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
          </>
        ) : (
          product.image_url ? (
            <Image src={product.image_url} alt={product.title} fill className="object-cover" unoptimized priority />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300"><Package size={64} /></div>
          )
        )}
      </div>

      <div className="p-6">
        {isEditing ? (
          <div className="space-y-3">
            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 outline-none text-sm font-bold" />
            <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 outline-none text-sm resize-none" />
            <div className="flex gap-2">
              <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 outline-none text-sm" />
              <input type="number" value={editStock} onChange={(e) => setEditStock(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border border-gray-200 outline-none text-sm" />
            </div>
          </div>
        ) : (
          <>
            {product.category && <p className="text-xs font-bold text-moshi-purple uppercase tracking-wider mb-1">{product.category}</p>}
            
            {/* TITRE + DRAPEAU VENDEUR */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h1 className="text-2xl font-extrabold text-moshi-text">{product.title}</h1>
              {sellerProfile?.country && (
                <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                  {getFlag(sellerProfile.country)} {sellerProfile.username || sellerProfile.full_name}
                </span>
              )}
            </div>

            <p className="text-3xl font-extrabold text-moshi-purple mb-4">{product.price.toLocaleString()} FCFA</p>
            <p className="text-sm text-gray-500 mb-6">Stock disponible : {product.stock}</p>
            {product.description && (
              <>
                <h2 className="text-sm font-bold mb-2">Description</h2>
                <p className="text-sm text-gray-600 whitespace-pre-line mb-6">{product.description}</p>
              </>
            )}
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 pb-safe">
        {isEditing ? (
          <div className="flex gap-2">
            <button onClick={() => setIsEditing(false)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-2">
              <X size={20} /> Annuler
            </button>
            <button onClick={handleSave} disabled={saving} className="flex-1 moshi-gradient text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="animate-spin" /> : <><Check size={20} /> Enregistrer</>}
            </button>
          </div>
        ) : (
          !isOwner && (
            <button onClick={handleBuy} disabled={buying || product.stock === 0} className="w-full moshi-gradient text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
              {buying ? <Loader2 className="animate-spin" /> : <><ShoppingBag size={20} /> {product.stock > 0 ? "Acheter maintenant" : "Rupture de stock"}</>}
            </button>
          )
        )}
      </div>
    </div>
  );
}
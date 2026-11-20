
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  Package,
  Loader2,
  X,
  ArrowLeft,
  Trash2,
} from "lucide-react";

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  stock: number;
  category: string | null;
  is_active: boolean;
  created_at: string;
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

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          router.replace("/auth/login");
          return;
        }

        if (!mounted) return;
        setUserId(user.id);

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, seller_status")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profile || !["vendeur", "seller"].includes(profile.role)) {
          alert("Ce compte n'est pas enregistré comme vendeur.");
          router.replace("/");
          return;
        }

        if (profile.seller_status !== "approved") {
          alert("Ta demande vendeur doit être approuvée avant de publier des produits.");
          router.replace("/");
          return;
        }

        const { data, error } = await supabase
          .from("products")
          .select(
            "id, title, description, price, image_url, stock, category, is_active, created_at"
          )
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (!mounted) return;
        setProducts((data || []) as Product[]);
        setIsVendeur(true);
      } catch (error) {
        console.error("Erreur chargement boutique vendeur:", error);
        alert(
          error instanceof Error
            ? error.message
            : "Impossible de charger ta boutique."
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const loadProducts = async (id: string) => {
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, title, description, price, image_url, stock, category, is_active, created_at"
      )
      .eq("seller_id", id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    setProducts((data || []) as Product[]);
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file || !userId) return;

    if (!file.type.startsWith("image/")) {
      alert("Choisis un fichier image valide.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("L'image ne doit pas dépasser 5 Mo.");
      event.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${userId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(filePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("products")
        .getPublicUrl(filePath);

      if (!data.publicUrl) {
        throw new Error("Impossible de récupérer l'adresse de l'image.");
      }

      setImageUrl(data.publicUrl);
    } catch (error) {
      console.error("Erreur upload image produit:", error);
      alert(
        error instanceof Error
          ? `Erreur d'envoi : ${error.message}`
          : "Impossible d'envoyer cette image."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice("");
    setStock("1");
    setCategory("");
    setImageUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!userId) {
      alert("Session expirée. Reconnecte-toi.");
      router.push("/auth/login");
      return;
    }

    const cleanTitle = title.trim();
    const numericPrice = Number(price);
    const numericStock = Number(stock);

    if (!cleanTitle) {
      alert("Saisis le nom du produit.");
      return;
    }

    if (!price || !Number.isFinite(numericPrice) || numericPrice < 0) {
      alert("Saisis un prix valide.");
      return;
    }

    if (
      !Number.isInteger(numericStock) ||
      numericStock < 0
    ) {
      alert("Saisis une quantité de stock valide.");
      return;
    }

    if (uploading) {
      alert("Attends la fin de l'envoi de l'image.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("products").insert({
        seller_id: userId,
        title: cleanTitle,
        description: description.trim() || null,
        price: numericPrice,
        stock: numericStock,
        category: category.trim() || null,
        image_url: imageUrl,
        is_active: true,
      });

      if (error) throw error;

      await loadProducts(userId);
      resetForm();
      setShowForm(false);
      alert("Produit publié avec succès.");
    } catch (error) {
      console.error("Erreur publication produit:", error);
      alert(
        error instanceof Error
          ? `Publication impossible : ${error.message}`
          : "Impossible de publier le produit."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer définitivement ce produit ?")) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id)
        .eq("seller_id", userId);

      if (error) throw error;

      setProducts((current) => current.filter((product) => product.id !== id));
    } catch (error) {
      console.error("Erreur suppression produit:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer ce produit."
      );
    }
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
    <div className="min-h-[100dvh] bg-moshi-bg pb-32">
      <header className="px-4 py-4 flex items-center justify-between bg-white shadow-sm sticky top-0 z-20">
        <Link href="/" className="p-2" aria-label="Retour">
          <ArrowLeft className="w-6 h-6" />
        </Link>

        <h1 className="text-lg font-bold">Ma Boutique</h1>

        <Link
          href="/seller/orders"
          className="relative p-2"
          aria-label="Mes commandes"
        >
          <Package className="w-6 h-6 text-moshi-purple" />
        </Link>
      </header>

      <div className="p-4 max-w-md mx-auto">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Package className="w-12 h-12 text-gray-300" />
            <p className="text-sm text-gray-500">
              Tu n'as pas encore de produits.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="moshi-gradient text-white font-bold px-5 py-3 rounded-xl"
            >
              Ajouter mon premier produit
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm relative"
              >
                <div className="aspect-square bg-gray-100 relative">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.title}
                      fill
                      sizes="(max-width: 640px) 50vw, 240px"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Package size={32} />
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <p className="text-sm font-bold truncate">
                    {product.title}
                  </p>
                  <p className="text-sm font-extrabold text-moshi-purple mt-1">
                    {Number(product.price).toLocaleString("fr-FR")} FCFA
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Stock : {product.stock}
                  </p>
                  <p className="text-[10px] mt-1">
                    {product.is_active ? (
                      <span className="text-green-600">Publié</span>
                    ) : (
                      <span className="text-orange-500">Masqué</span>
                    )}
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(product.id)}
                  aria-label={`Supprimer ${product.title}`}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center z-10"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setShowForm(true)}
        aria-label="Ajouter un produit"
        className="fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full moshi-gradient shadow-2xl shadow-purple-500/50 flex items-center justify-center text-white active:scale-95 transition"
      >
        <Plus size={32} strokeWidth={2.5} />
      </button>

      {showForm && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end justify-center">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 max-h-[90dvh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Nouveau produit</h2>
              <button
                onClick={() => {
                  if (saving || uploading) return;
                  setShowForm(false);
                }}
                className="p-2"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="relative w-full aspect-square rounded-2xl bg-gray-100 overflow-hidden mb-2">
                {imageUrl ? (
                  <>
                    <Image
                      src={imageUrl}
                      alt="Aperçu du produit"
                      fill
                      sizes="(max-width: 640px) 100vw, 448px"
                      className="object-cover"
                      unoptimized
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-3 right-3 bg-white px-3 py-2 rounded-full text-xs font-semibold shadow-md"
                    >
                      Changer l'image
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400"
                  >
                    {uploading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>
                        <Plus size={32} />
                        <span className="text-xs">Ajouter une image</span>
                      </>
                    )}
                  </button>
                )}

                {uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                    <Loader2 className="animate-spin" />
                  </div>
                )}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              <input
                type="text"
                placeholder="Nom du produit"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none text-sm"
              />

              <textarea
                placeholder="Description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                maxLength={2000}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none text-sm resize-none"
              />

              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Prix (FCFA)"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  className="w-full min-w-0 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none text-sm"
                />

                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Stock"
                  value={stock}
                  onChange={(event) => setStock(event.target.value)}
                  className="w-full min-w-0 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none text-sm"
                />
              </div>

              <input
                type="text"
                placeholder="Catégorie (ex. Mode, Beauté)"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                maxLength={80}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none text-sm"
              />

              <button
                onClick={handleSave}
                disabled={saving || uploading || !title.trim() || !price}
                className="w-full moshi-gradient text-white font-bold py-3.5 rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Publication...
                  </>
                ) : (
                  "Publier le produit"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


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
  ImagePlus,
  MapPin,
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

interface ProductPhoto {
  id: string;
  file: File;
  preview: string;
  url?: string;
}

const MAX_PHOTOS = 8;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none text-sm focus:border-purple-400";

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

  const [sellerAddress, setSellerAddress] = useState("");
  const [sellerCountry, setSellerCountry] = useState("");

  const [photos, setPhotos] = useState<ProductPhoto[]>([]);

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
          alert(
            "Ta demande vendeur doit être approuvée avant de publier des produits."
          );
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

  const releasePhotoPreviews = (items: ProductPhoto[]) => {
    items.forEach((photo) => URL.revokeObjectURL(photo.preview));
  };

  const handlePhotosChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    if (!files.length) return;

    const remaining = MAX_PHOTOS - photos.length;

    if (remaining <= 0) {
      alert(`Tu peux ajouter au maximum ${MAX_PHOTOS} photos.`);
      return;
    }

    const accepted: ProductPhoto[] = [];

    for (const file of files) {
      if (photos.length + accepted.length >= MAX_PHOTOS) {
        alert(`Maximum ${MAX_PHOTOS} photos par produit.`);
        break;
      }

      if (!file.type.startsWith("image/")) {
        alert(`${file.name} n'est pas une image valide.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name} dépasse la limite de 5 Mo.`);
        continue;
      }

      accepted.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }

    setPhotos((current) => [...current, ...accepted]);
  };

  const removePhoto = (photoId: string) => {
    setPhotos((current) => {
      const photo = current.find((item) => item.id === photoId);

      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }

      return current.filter((item) => item.id !== photoId);
    });
  };

  const resetForm = () => {
    releasePhotoPreviews(photos);

    setTitle("");
    setDescription("");
    setPrice("");
    setStock("1");
    setCategory("");
    setSellerAddress("");
    setSellerCountry("");
    setPhotos([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (!userId) {
      throw new Error("Session utilisateur introuvable.");
    }

    const uploadedUrls: string[] = [];

    for (const photo of photos) {
      const extension =
        photo.file.name.split(".").pop()?.toLowerCase() || "jpg";

      const filePath = `${userId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("products")
        .upload(filePath, photo.file, {
          cacheControl: "3600",
          contentType: photo.file.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(
          `Impossible d'envoyer ${photo.file.name} : ${uploadError.message}`
        );
      }

      const { data } = supabase.storage
        .from("products")
        .getPublicUrl(filePath);

      if (!data.publicUrl) {
        throw new Error("Impossible de récupérer l'adresse d'une photo.");
      }

      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  };

  const validateForm = () => {
    if (!title.trim()) {
      alert("Saisis le nom du produit.");
      return false;
    }

    if (!description.trim()) {
      alert("La description du produit est obligatoire.");
      return false;
    }

    if (description.trim().length < 10) {
      alert("La description doit contenir au moins 10 caractères.");
      return false;
    }

    if (!price || !Number.isFinite(Number(price)) || Number(price) <= 0) {
      alert("Saisis un prix valide supérieur à zéro.");
      return false;
    }

    const numericStock = Number(stock);

    if (!Number.isInteger(numericStock) || numericStock < 0) {
      alert("Saisis une quantité de stock valide.");
      return false;
    }

    if (photos.length < 2) {
      alert("Ajoute au minimum deux photos du produit.");
      return false;
    }

    if (!sellerAddress.trim()) {
      alert("L'adresse du vendeur est obligatoire.");
      return false;
    }

    if (!sellerCountry.trim()) {
      alert("Le pays du vendeur est obligatoire.");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!userId) {
      alert("Session expirée. Reconnecte-toi.");
      router.push("/auth/login");
      return;
    }

    if (!validateForm()) return;

    setSaving(true);
    setUploading(true);

    try {
      const imageUrls = await uploadPhotos();

      if (imageUrls.length < 2) {
        throw new Error("Au moins deux photos sont obligatoires.");
      }

      const { data: productId, error } = await supabase.rpc(
        "create_seller_product",
        {
          p_title: title.trim(),
          p_description: description.trim(),
          p_price: Number(price),
          p_stock: Number(stock),
          p_category: category.trim() || null,
          p_seller_address: sellerAddress.trim(),
          p_seller_country: sellerCountry.trim(),
          p_image_urls: imageUrls,
        }
      );

      if (error) throw error;

      if (!productId) {
        throw new Error("La publication n'a pas retourné d'identifiant.");
      }

      await loadProducts(userId);

      resetForm();
      setShowForm(false);

      alert("Produit publié avec succès !");
    } catch (error) {
      console.error("Erreur publication produit:", error);

      alert(
        error instanceof Error
          ? `Publication impossible : ${error.message}`
          : "Impossible de publier le produit."
      );
    } finally {
      setUploading(false);
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

      setProducts((current) =>
        current.filter((product) => product.id !== id)
      );
    } catch (error) {
      console.error("Erreur suppression produit:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Impossible de supprimer ce produit."
      );
    }
  };

  const closeForm = () => {
    if (saving || uploading) return;

    resetForm();
    setShowForm(false);
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
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 max-h-[92dvh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-lg font-bold">Nouveau produit</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Tous les champs marqués obligatoires doivent être remplis.
                </p>
              </div>

              <button
                onClick={closeForm}
                disabled={saving || uploading}
                className="p-2 disabled:opacity-40"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* PHOTOS */}
              <section>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold">
                    Photos du produit *
                  </label>

                  <span
                    className={`text-xs font-semibold ${
                      photos.length >= 2
                        ? "text-green-600"
                        : "text-orange-500"
                    }`}
                  >
                    {photos.length}/{MAX_PHOTOS} photos
                  </span>
                </div>

                <p className="text-xs text-gray-500 mb-3">
                  Ajoute au minimum 2 photos. Formats image, 5 Mo maximum par
                  photo.
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square rounded-xl overflow-hidden bg-gray-100"
                    >
                      <Image
                        src={photo.preview}
                        alt={`Photo ${index + 1}`}
                        fill
                        sizes="120px"
                        className="object-cover"
                        unoptimized
                      />

                      {index === 0 && (
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-2 py-1 rounded-full">
                          Principale
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        disabled={saving || uploading}
                        aria-label="Retirer cette photo"
                        className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/65 text-white flex items-center justify-center"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  {photos.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={saving || uploading}
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-2 text-gray-500 disabled:opacity-50"
                    >
                      <ImagePlus size={25} />
                      <span className="text-[10px] font-semibold">
                        Ajouter
                      </span>
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handlePhotosChange}
                  className="hidden"
                />

                {photos.length < 2 && (
                  <p className="text-xs text-orange-600 mt-2">
                    Il manque {2 - photos.length} photo(s) minimum.
                  </p>
                )}
              </section>

              {/* INFORMATIONS PRODUIT */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Nom du produit *
                </label>

                <input
                  type="text"
                  placeholder="Ex. Chaussures pour homme"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={120}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Description obligatoire *
                </label>

                <textarea
                  placeholder="Décris précisément ton produit, ses caractéristiques et son état..."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  maxLength={2000}
                  className={`${inputClass} resize-none`}
                />

                <p className="text-[10px] text-gray-400 text-right mt-1">
                  {description.length}/2000
                </p>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-semibold mb-2">
                    Prix (FCFA) *
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Prix"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-semibold mb-2">
                    Stock *
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Stock"
                    value={stock}
                    onChange={(event) => setStock(event.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Catégorie
                </label>

                <input
                  type="text"
                  placeholder="Ex. Mode, Beauté, Électronique"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  maxLength={80}
                  className={inputClass}
                />
              </div>

              {/* LOCALISATION VENDEUR */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={18} className="text-moshi-purple" />
                  <h3 className="font-bold text-sm">
                    Localisation du vendeur
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Adresse du vendeur *
                    </label>

                    <textarea
                      placeholder="Ville, quartier, rue ou adresse de ton établissement..."
                      value={sellerAddress}
                      onChange={(event) =>
                        setSellerAddress(event.target.value)
                      }
                      rows={3}
                      maxLength={500}
                      className={`${inputClass} resize-none`}
                    />

                    <p className="text-[10px] text-gray-400 mt-1">
                      Indique l'adresse de ton activité ou de ton point de
                      vente.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Pays du vendeur *
                    </label>

                    <input
                      type="text"
                      placeholder="Ex. Togo"
                      value={sellerCountry}
                      onChange={(event) =>
                        setSellerCountry(event.target.value)
                      }
                      maxLength={100}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* PUBLICATION */}
              <button
                onClick={handleSave}
                disabled={
                  saving ||
                  uploading ||
                  !title.trim() ||
                  !description.trim() ||
                  !price ||
                  photos.length < 2 ||
                  !sellerAddress.trim() ||
                  !sellerCountry.trim()
                }
                className="w-full moshi-gradient text-white font-bold py-4 rounded-xl shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-3"
              >
                {saving || uploading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    {uploading ? "Envoi des photos..." : "Publication..."}
                  </>
                ) : (
                  <>
                    <Package size={20} />
                    Publier le produit
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-gray-400">
                La publication est vérifiée par Moshi avant son
                enregistrement.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

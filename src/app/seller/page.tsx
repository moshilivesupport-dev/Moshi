"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Plus,
  Package,
  Loader2,
  X,
  ArrowLeft,
  Trash2,
  ImagePlus,
  MapPin,
  Store,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import {
  deleteMoshiMedia,
  uploadMoshiMedia,
  type UploadedMedia,
} from "@/lib/media";

import {
  getPrimaryProductImage,
  normalizeProductImages,
} from "@/lib/products";

import { useMoshiPreferences } from "@/components/providers/MoshiPreferencesProvider";

interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  images: unknown;
  stock: number;
  category_id: string | null;
  category?: { name: string } | null;
  status: string;
  created_at: string;
}

interface ProductPhoto {
  id: string;
  file: File;
  preview: string;
}

const MAX_PHOTOS = 8;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:border-purple-400";

export default function SellerDashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    t,
    formatMoney,
  } = useMoshiPreferences();

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
  const [sellerCountry, setSellerCountry] = useState("Togo");

  const [photos, setPhotos] = useState<ProductPhoto[]>([]);

  const loadProducts = async (id: string) => {
    const { data, error } = await supabase
      .from("products")
      .select(
        `
          id,
          title,
          description,
          price,
          currency,
          images,
          stock,
          category_id,
          status,
          created_at,
          category:categories(name)
        `
      )
      .eq("seller_id", id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    setProducts((data || []) as Product[]);
  };

  useEffect(() => {
    let mounted = true;

    async function loadData() {
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

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("role,seller_status,country")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) throw profileError;

        if (
          !profile ||
          !["vendeur", "seller"].includes(profile.role)
        ) {
          window.alert(
            t("Ce compte n'est pas enregistré comme vendeur.")
          );

          router.replace("/");
          return;
        }

        if (profile.seller_status !== "approved") {
          window.alert(
            t(
              "Ta demande vendeur doit être approuvée avant de publier des produits."
            )
          );

          router.replace("/");
          return;
        }

        if (!mounted) return;

        setSellerCountry(profile.country || "Togo");

        await loadProducts(user.id);

        if (!mounted) return;

        setIsVendeur(true);
      } catch (error) {
        console.error(
          "Moshi seller dashboard:",
          error
        );

        window.alert(
          error instanceof Error
            ? error.message
            : t("Impossible de charger ta boutique.")
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadData();

    return () => {
      mounted = false;
    };
  }, [router, supabase, t]);

  const releasePhotoPreviews = (
    items: ProductPhoto[]
  ) => {
    items.forEach((photo) => {
      URL.revokeObjectURL(photo.preview);
    });
  };

  const handlePhotosChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);

    event.target.value = "";

    if (!files.length) return;

    const accepted: ProductPhoto[] = [];

    for (const file of files) {
      if (photos.length + accepted.length >= MAX_PHOTOS) {
        window.alert(
          t(`Maximum ${MAX_PHOTOS} photos par produit.`)
        );
        break;
      }

      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        window.alert(
          `${file.name} : ${t("Utilise JPG, PNG ou WebP.")}`
        );
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        window.alert(
          `${file.name} ${t("dépasse la limite de 5 Mo.")}`
        );
        continue;
      }

      accepted.push({
        id:
          `${Date.now()}-` +
          Math.random().toString(36).slice(2),
        file,
        preview: URL.createObjectURL(file),
      });
    }

    setPhotos((current) => [
      ...current,
      ...accepted,
    ]);
  };

  const removePhoto = (photoId: string) => {
    setPhotos((current) => {
      const photo = current.find(
        (item) => item.id === photoId
      );

      if (photo) {
        URL.revokeObjectURL(photo.preview);
      }

      return current.filter(
        (item) => item.id !== photoId
      );
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
    setPhotos([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadPhotos = async (): Promise<UploadedMedia[]> => {
    if (!userId) {
      throw new Error(
        t("Session utilisateur introuvable.")
      );
    }

    const uploadedMedia: UploadedMedia[] = [];

    try {
      for (const photo of photos) {
        const uploaded = await uploadMoshiMedia(
          photo.file,
          "products"
        );

        uploadedMedia.push(uploaded);
      }

      return uploadedMedia;
    } catch (error) {
      await Promise.allSettled(
        uploadedMedia.map((media) =>
          deleteMoshiMedia(media.key)
        )
      );

      throw error;
    }
  };

  const validateForm = () => {
    if (!title.trim()) {
      window.alert(t("Saisis le nom du produit."));
      return false;
    }

    if (title.trim().length > 120) {
      window.alert(t("Le titre est trop long."));
      return false;
    }

    if (description.trim().length < 10) {
      window.alert(
        t(
          "La description doit contenir au moins 10 caractères."
        )
      );
      return false;
    }

    if (description.trim().length > 2000) {
      window.alert(t("La description est trop longue."));
      return false;
    }

    const numericPrice = Number(price);

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0 ||
      !Number.isInteger(numericPrice)
    ) {
      window.alert(
        t("Le prix doit être un montant entier en XOF.")
      );
      return false;
    }

    const numericStock = Number(stock);

    if (
      !Number.isInteger(numericStock) ||
      numericStock < 0
    ) {
      window.alert(t("Quantité de stock invalide."));
      return false;
    }

    if (photos.length < 2) {
      window.alert(
        t("Ajoute au minimum deux photos du produit.")
      );
      return false;
    }

    if (!sellerAddress.trim()) {
      window.alert(
        t("L'adresse du vendeur est obligatoire.")
      );
      return false;
    }

    if (!sellerCountry.trim()) {
      window.alert(
        t("Le pays du vendeur est obligatoire.")
      );
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!userId) {
      window.alert(
        t("Session expirée. Reconnecte-toi.")
      );

      router.push("/auth/login");
      return;
    }

    if (saving || !validateForm()) return;

    setSaving(true);
    setUploading(true);

    let uploadedImages: UploadedMedia[] = [];
    let productCreated = false;

    try {
      uploadedImages = await uploadPhotos();

      if (uploadedImages.length < 2) {
        throw new Error(
          t("Au moins deux photos sont obligatoires.")
        );
      }

      const { data: productId, error } =
        await supabase.rpc("create_seller_product", {
          p_title: title.trim(),
          p_description: description.trim(),
          p_price: Number(price),
          p_stock: Number(stock),
          p_category: category.trim() || null,
          p_seller_address: sellerAddress.trim(),
          p_seller_country: sellerCountry.trim(),
          p_image_urls: uploadedImages,
        });

      if (error) throw error;

      if (!productId) {
        throw new Error(
          t("La publication n'a pas retourné d'identifiant.")
        );
      }

      productCreated = true;

      await loadProducts(userId);

      resetForm();
      setShowForm(false);

      window.alert(t("Produit publié avec succès !"));
    } catch (error) {
      console.error("Publication produit:", error);

      if (!productCreated && uploadedImages.length) {
        await Promise.allSettled(
          uploadedImages.map((image) =>
            deleteMoshiMedia(image.key)
          )
        );
      }

      window.alert(
        error instanceof Error
          ? `${t("Publication impossible")} : ${error.message}`
          : t("Impossible de publier le produit.")
      );
    } finally {
      setUploading(false);
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!userId || saving) return;

    if (
      !window.confirm(
        t("Supprimer définitivement ce produit ?")
      )
    ) {
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id)
        .eq("seller_id", userId);

      if (error) throw error;

      setProducts((current) =>
        current.filter(
          (item) => item.id !== product.id
        )
      );

      const images = normalizeProductImages(
        product.images
      );

      await Promise.allSettled(
        images
          .filter((image) => image.key)
          .map((image) =>
            deleteMoshiMedia(image.key as string)
          )
      );
    } catch (error) {
      console.error("Suppression produit:", error);

      window.alert(
        error instanceof Error
          ? error.message
          : t("Impossible de supprimer ce produit.")
      );
    } finally {
      setSaving(false);
    }
  };

  const closeForm = () => {
    if (saving || uploading) return;

    resetForm();
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-moshi-bg">
        <Loader2 className="h-10 w-10 animate-spin text-moshi-purple" />
      </div>
    );
  }

  if (!isVendeur) return null;

  return (
    <div className="min-h-[100dvh] bg-moshi-bg pb-32">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-white px-4 py-4 shadow-sm">
        <Link
          href="/"
          className="p-2"
          aria-label={t("Retour")}
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>

        <h1 className="text-lg font-bold">
          {t("Ma Boutique")}
        </h1>

        <Link
          href="/seller/orders"
          className="relative p-2"
          aria-label={t("Mes commandes")}
        >
          <Package className="h-6 w-6 text-moshi-purple" />
        </Link>
      </header>

      <div className="mx-auto max-w-md p-4">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <Package className="h-12 w-12 text-gray-300" />

            <p className="text-sm text-gray-500">
              {t("Tu n'as pas encore de produits.")}
            </p>

            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-xl moshi-gradient px-5 py-3 font-bold text-white"
            >
              {t("Ajouter mon premier produit")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => {
              const image = getPrimaryProductImage(
                product.images
              );

              return (
                <div
                  key={product.id}
                  className="relative overflow-hidden rounded-2xl bg-white shadow-sm"
                >
                  <div className="relative aspect-square bg-gray-100">
                    {image ? (
                      <Image
                        src={image}
                        alt={product.title}
                        fill
                        sizes="(max-width: 640px) 50vw, 240px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-300">
                        <Package size={32} />
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <p className="truncate text-sm font-bold">
                      {product.title}
                    </p>

                    <p className="mt-1 text-sm font-extrabold text-moshi-purple">
                      {formatMoney(Number(product.price))}
                    </p>

                    <p className="mt-1 text-[10px] text-gray-400">
                      {t("Stock")} : {product.stock}
                    </p>

                    {product.category?.name && (
                      <p className="mt-1 truncate text-[10px] text-gray-400">
                        {product.category.name}
                      </p>
                    )}

                    <p className="mt-1 text-[10px]">
                      {product.status === "active" ? (
                        <span className="text-green-600">
                          {t("Publié")}
                        </span>
                      ) : (
                        <span className="text-orange-500">
                          {t("Non publié")}
                        </span>
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleDelete(product)}
                    disabled={saving}
                    aria-label={`${t("Supprimer")} ${product.title}`}
                    className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowForm(true)}
        aria-label={t("Ajouter un produit")}
        className="fixed bottom-6 right-6 z-40 flex h-16 w-16 items-center justify-center rounded-full moshi-gradient text-white shadow-2xl shadow-purple-500/50 transition active:scale-95"
      >
        <Plus size={32} strokeWidth={2.5} />
      </button>

      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60">
          <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  {t("Nouveau produit")}
                </h2>

                <p className="mt-1 text-xs text-gray-400">
                  {t("Les champs marqués obligatoires doivent être remplis.")}
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving || uploading}
                className="p-2 disabled:opacity-40"
                aria-label={t("Fermer")}
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-bold">
                    {t("Photos du produit")} *
                  </label>

                  <span
                    className={`text-xs font-semibold ${
                      photos.length >= 2
                        ? "text-green-600"
                        : "text-orange-500"
                    }`}
                  >
                    {photos.length}/{MAX_PHOTOS}
                  </span>
                </div>

                <p className="mb-3 text-xs text-gray-500">
                  {t("Ajoute au minimum deux photos. JPG, PNG ou WebP, 5 Mo maximum par photo.")}
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square overflow-hidden rounded-xl bg-gray-100"
                    >
                      <Image
                        src={photo.preview}
                        alt={`${t("Photo")} ${index + 1}`}
                        fill
                        sizes="120px"
                        className="object-cover"
                        unoptimized
                      />

                      {index === 0 && (
                        <span className="absolute bottom-1 left-1 rounded-full bg-black/60 px-2 py-1 text-[9px] text-white">
                          {t("Principale")}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        disabled={saving || uploading}
                        aria-label={t("Retirer cette photo")}
                        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  {photos.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      disabled={saving || uploading}
                      className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 disabled:opacity-50"
                    >
                      <ImagePlus size={25} />

                      <span className="text-[10px] font-semibold">
                        {t("Ajouter")}
                      </span>
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handlePhotosChange}
                  className="hidden"
                />

                {photos.length < 2 && (
                  <p className="mt-2 text-xs text-orange-600">
                    {t("Il manque")} {2 - photos.length}{" "}
                    {t("photo(s) minimum.")}
                  </p>
                )}
              </section>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  {t("Nom du produit")} *
                </label>

                <input
                  type="text"
                  placeholder={t("Ex. Chaussures pour homme")}
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  maxLength={120}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  {t("Description obligatoire")} *
                </label>

                <textarea
                  placeholder={t(
                    "Décris précisément ton produit, ses caractéristiques et son état..."
                  )}
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  rows={4}
                  maxLength={2000}
                  className={`${inputClass} resize-none`}
                />

                <p className="mt-1 text-right text-[10px] text-gray-400">
                  {description.length}/2000
                </p>
              </div>

              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <label className="mb-2 block text-sm font-semibold">
                    {t("Prix de base (XOF)")} *
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Prix XOF"
                    value={price}
                    onChange={(event) =>
                      setPrice(event.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <label className="mb-2 block text-sm font-semibold">
                    {t("Stock")} *
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Stock"
                    value={stock}
                    onChange={(event) =>
                      setStock(event.target.value)
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <p className="text-[11px] leading-5 text-gray-500">
                {t("Le prix est enregistré en XOF. Les acheteurs le verront dans leur devise préférée.")}
              </p>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  {t("Catégorie")}
                </label>

                <input
                  type="text"
                  placeholder={t("Ex. Mode, Beauté, Électronique")}
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value)
                  }
                  maxLength={80}
                  className={inputClass}
                />
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="mb-3 flex items-center gap-2">
                  <MapPin
                    size={18}
                    className="text-moshi-purple"
                  />

                  <h3 className="text-sm font-bold">
                    {t("Localisation du vendeur")}
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      {t("Adresse du vendeur")} *
                    </label>

                    <textarea
                      placeholder={t(
                        "Ville, quartier, rue ou adresse de ton établissement..."
                      )}
                      value={sellerAddress}
                      onChange={(event) =>
                        setSellerAddress(event.target.value)
                      }
                      rows={3}
                      maxLength={500}
                      className={`${inputClass} resize-none`}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      {t("Pays du vendeur")} *
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

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={
                  saving ||
                  uploading ||
                  !title.trim() ||
                  description.trim().length < 10 ||
                  !price ||
                  photos.length < 2 ||
                  !sellerAddress.trim() ||
                  !sellerCountry.trim()
                }
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl moshi-gradient py-4 font-bold text-white shadow-lg disabled:opacity-50"
              >
                {saving || uploading ? (
                  <>
                    <Loader2
                      className="animate-spin"
                      size={20}
                    />

                    {uploading
                      ? t("Envoi des photos...")
                      : t("Publication...")}
                  </>
                ) : (
                  <>
                    <Package size={20} />
                    {t("Publier le produit")}
                  </>
                )}
              </button>

              <p className="text-center text-[10px] text-gray-400">
                {t("Les photos sont stockées sur Cloudflare R2.")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
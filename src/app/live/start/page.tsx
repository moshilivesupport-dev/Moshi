"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Radio,
  Loader2,
  Package,
  Check,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useMoshiPreferences } from "@/components/providers/MoshiPreferencesProvider";

type ProductImage = {
  key?: string;
  url?: string;
} | string;

type SellerProduct = {
  id: string;
  title: string;
  price: number;
  currency: string;
  stock: number;
  images: ProductImage[] | null;
};

function getProductImage(images: ProductImage[] | null): string | null {
  if (!Array.isArray(images)) return null;

  for (const image of images) {
    if (typeof image === "string" && image.trim()) {
      return image;
    }

    if (
      image &&
      typeof image === "object" &&
      typeof image.url === "string" &&
      image.url.trim()
    ) {
      return image.url;
    }
  }

  return null;
}

function StartLiveForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const { formatMoney } = useMoshiPreferences();

  const requestedMode = searchParams.get("mode");
  const mode = requestedMode === "vendeur" ? "vendeur" : "simple";

  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [sellerApproved, setSellerApproved] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    let active = true;

    const init = async () => {
      setLoading(true);
      setPageError("");

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

        if (!active) return;

        setUserId(user.id);

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role,seller_status")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profile) {
          throw new Error("Ton profil Moshi est introuvable.");
        }

        const currentRole = profile.role || "acheteur";
        const approved =
          profile.seller_status === "approved" &&
          (currentRole === "vendeur" || currentRole === "seller");

        if (!active) return;

        setRole(currentRole);
        setSellerApproved(approved);

        if (mode === "vendeur" && !approved) {
          setPageError(
            "Le live vendeur est réservé aux vendeurs dont le compte est approuvé."
          );
          return;
        }

        if (approved) {
          const { data: productRows, error: productsError } = await supabase
            .from("products")
            .select("id,title,price,currency,stock,images")
            .eq("seller_id", user.id)
            .eq("status", "active")
            .gt("stock", 0)
            .order("created_at", { ascending: false });

          if (productsError) throw productsError;

          if (!active) return;

          setProducts(
            (productRows || []).map((product: any) => ({
              ...product,
              price: Number(product.price || 0),
              stock: Number(product.stock || 0),
              currency: product.currency || "XOF",
              images: Array.isArray(product.images)
                ? product.images
                : [],
            }))
          );
        }
      } catch (error: any) {
        console.error("Initialisation du live :", error);

        if (active) {
          setPageError(
            error?.message || "Impossible de préparer ton direct."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void init();

    return () => {
      active = false;
    };
  }, [mode, router, supabase]);

  const handleStart = async () => {
    if (!userId || starting) return;

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    if (cleanTitle.length < 3 || cleanTitle.length > 100) {
      setPageError("Le titre doit contenir entre 3 et 100 caractères.");
      return;
    }

    if (cleanDescription.length > 1000) {
      setPageError("La description ne doit pas dépasser 1 000 caractères.");
      return;
    }

    if (mode === "vendeur" && !sellerApproved) {
      setPageError("Ton compte vendeur n'est pas encore approuvé.");
      return;
    }

    if (selectedProduct && !products.some((p) => p.id === selectedProduct)) {
      setPageError("Le produit sélectionné n'est plus disponible.");
      return;
    }

    setStarting(true);
    setPageError("");

    try {
      const { data, error } = await supabase.rpc("create_live_session", {
        p_title: cleanTitle,
        p_description: cleanDescription || null,
        p_product_id: mode === "vendeur" ? selectedProduct : null,
        p_mode: mode,
      });

      if (error) throw error;

      if (!data || typeof data !== "string") {
        throw new Error("Supabase n'a pas retourné l'identifiant du direct.");
      }

      router.push(`/live/${data}`);
    } catch (error: any) {
      console.error("Création du direct :", error);

      setPageError(
        error?.message || "Impossible de lancer le direct. Réessaie."
      );
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-moshi-bg">
        <Loader2 className="w-10 h-10 text-moshi-purple animate-spin" />
      </div>
    );
  }

  if (pageError && mode === "vendeur" && !sellerApproved) {
    return (
      <main className="min-h-[100dvh] bg-moshi-bg p-5 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-sm text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-50 flex items-center justify-center">
            <Radio className="text-red-500" size={26} />
          </div>
          <h1 className="text-lg font-extrabold mt-4">
            Live vendeur indisponible
          </h1>
          <p className="text-sm text-gray-500 mt-2">{pageError}</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-6 w-full rounded-xl bg-moshi-purple text-white py-3 font-bold"
          >
            Retour à l'accueil
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-moshi-bg pb-32">
      <header className="px-4 py-4 flex items-center justify-between bg-white shadow-sm sticky top-0 z-20">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Retour"
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <h1 className="text-lg font-bold">
          {mode === "vendeur" ? "Live vendeur" : "Live simple"}
        </h1>

        <div className="w-10" />
      </header>

      <div className="p-5 max-w-md mx-auto space-y-5">
        <div className="rounded-2xl bg-white p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
              <Radio className="text-red-500" size={22} />
            </div>
            <div>
              <p className="font-extrabold text-gray-900">
                {mode === "vendeur" ? "Présente ta boutique" : "Démarre ton direct"}
              </p>
              <p className="text-xs text-gray-500">
                Prépare ton titre avant de commencer.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="live-title"
            className="text-xs font-bold text-gray-500 ml-1"
          >
            Titre du live
          </label>
          <input
            id="live-title"
            type="text"
            maxLength={100}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ex : Nouvelle collection d'été"
            className="w-full mt-1 px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium"
          />
          <p className="text-right text-[10px] text-gray-400 mt-1">
            {title.length}/100
          </p>
        </div>

        <div>
          <label
            htmlFor="live-description"
            className="text-xs font-bold text-gray-500 ml-1"
          >
            Description (facultatif)
          </label>
          <textarea
            id="live-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Décris ce que tu vas présenter..."
            className="w-full mt-1 px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium resize-none"
          />
        </div>

        {sellerApproved && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-500 ml-1">
                Épingler un produit
              </label>
              {selectedProduct && (
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="text-xs font-bold text-red-500"
                >
                  Retirer
                </button>
              )}
            </div>

            {products.length === 0 ? (
              <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-3 text-sm text-gray-500">
                <Package size={20} className="text-gray-400" />
                Aucun produit actif en stock dans ta boutique.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {products.map((product) => {
                  const imageUrl = getProductImage(product.images);
                  const selected = selectedProduct === product.id;

                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() =>
                        setSelectedProduct(selected ? null : product.id)
                      }
                      className={`relative p-2 rounded-xl border-2 transition-all text-left ${
                        selected
                          ? "border-moshi-purple bg-purple-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="w-full h-28 rounded-lg overflow-hidden bg-gray-100 mb-2 relative">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={product.title}
                            fill
                            sizes="(max-width: 640px) 45vw, 180px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <Package className="absolute inset-0 m-auto text-gray-300" />
                        )}
                      </div>

                      {selected && (
                        <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-moshi-purple text-white flex items-center justify-center">
                          <Check size={14} />
                        </span>
                      )}

                      <p className="text-xs font-bold truncate">
                        {product.title}
                      </p>
                      <p className="text-[11px] text-moshi-purple font-extrabold mt-1">
                        {formatMoney(product.price, product.currency)}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Stock : {product.stock}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {pageError && (
          <div
            role="alert"
            className="rounded-xl bg-red-50 border border-red-100 p-3 text-xs text-red-700"
          >
            {pageError}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 pb-safe">
        <button
          type="button"
          onClick={() => void handleStart()}
          disabled={starting || title.trim().length < 3}
          className="w-full bg-red-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-200/50 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {starting ? (
            <>
              <Loader2 className="animate-spin" />
              Préparation du direct...
            </>
          ) : (
            <>
              <Radio size={20} />
              Lancer le live
            </>
          )}
        </button>
      </div>
    </main>
  );
}

export default function StartLivePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center bg-moshi-bg">
          <Loader2 className="w-10 h-10 text-moshi-purple animate-spin" />
        </div>
      }
    >
      <StartLiveForm />
    </Suspense>
  );
}
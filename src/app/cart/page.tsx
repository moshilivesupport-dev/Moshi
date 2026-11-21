
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Loader2,
  Package,
  ShoppingCart,
  Store,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type CartProduct = {
  id: string;
  title: string;
  price: number;
  currency: string;
  image_url: string | null;
  stock: number;
  seller_id: string;
  is_active: boolean;
};

type CartItem = {
  id: string;
  product_id: string;
  quantity: number;
  product: CartProduct;
};

type SellerGroup = {
  sellerId: string;
  items: CartItem[];
  subtotal: number;
};

export default function CartPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
    setLoading(true);

    try {
      const { data: auth, error: authError } =
        await supabase.auth.getUser();

      if (authError || !auth.user) {
        setUserId(null);
        setItems([]);
        return;
      }

      setUserId(auth.user.id);

      const { data: cartRows, error: cartError } =
        await supabase
          .from("cart_items")
          .select("id,product_id,quantity")
          .eq("user_id", auth.user.id)
          .order("created_at", { ascending: false });

      if (cartError) throw cartError;

      if (!cartRows?.length) {
        setItems([]);
        return;
      }

      const productIds = cartRows.map(
        (row) => row.product_id
      );

      const { data: products, error: productError } =
        await supabase
          .from("products")
          .select(
            "id,title,price,currency,image_url,stock,seller_id,is_active"
          )
          .in("id", productIds);

      if (productError) throw productError;

      const productMap = new Map(
        (products || []).map((product) => [
          product.id,
          product,
        ])
      );

      const merged: CartItem[] = cartRows
        .map((row) => {
          const product = productMap.get(row.product_id);

          if (!product) return null;

          return {
            id: row.id,
            product_id: row.product_id,
            quantity: row.quantity,
            product,
          };
        })
        .filter(Boolean) as CartItem[];

      setItems(merged);
    } catch (error) {
      console.error("Erreur chargement panier :", error);
      alert("Impossible de charger ton panier.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  const groups = useMemo(() => {
    const grouped = new Map<string, SellerGroup>();

    for (const item of items) {
      const sellerId = item.product.seller_id;

      if (!grouped.has(sellerId)) {
        grouped.set(sellerId, {
          sellerId,
          items: [],
          subtotal: 0,
        });
      }

      const group = grouped.get(sellerId)!;

      group.items.push(item);
      group.subtotal +=
        Number(item.product.price) * item.quantity;
    }

    return Array.from(grouped.values());
  }, [items]);

  const total = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          Number(item.product.price) * item.quantity,
        0
      ),
    [items]
  );

  const updateQuantity = async (
    item: CartItem,
    nextQuantity: number
  ) => {
    if (!userId || updating) return;

    if (nextQuantity <= 0) {
      await removeItem(item);
      return;
    }

    if (nextQuantity > item.product.stock) {
      alert(
        `Stock disponible : ${item.product.stock}`
      );
      return;
    }

    setUpdating(item.id);

    const { error } = await supabase
      .from("cart_items")
      .update({
        quantity: nextQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("user_id", userId);

    if (error) {
      alert("Impossible de modifier la quantité.");
    } else {
      setItems((current) =>
        current.map((row) =>
          row.id === item.id
            ? { ...row, quantity: nextQuantity }
            : row
        )
      );
    }

    setUpdating(null);
  };

  const removeItem = async (item: CartItem) => {
    if (!userId || updating) return;

    setUpdating(item.id);

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", item.id)
      .eq("user_id", userId);

    if (error) {
      alert("Impossible de supprimer ce produit.");
    } else {
      setItems((current) =>
        current.filter((row) => row.id !== item.id)
      );
    }

    setUpdating(null);
  };

  const clearCart = async () => {
    if (!userId || !items.length) return;

    if (!confirm("Vider complètement ton panier ?")) {
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", userId);

    if (error) {
      alert("Impossible de vider le panier.");
    } else {
      setItems([]);
    }

    setLoading(false);
  };

  const checkout = () => {
    const unavailable = items.filter(
      (item) =>
        !item.product.is_active ||
        item.product.stock < item.quantity
    );

    if (unavailable.length) {
      alert(
        "Certains produits ne sont plus disponibles ou leur stock est insuffisant. Mets ton panier à jour avant de continuer."
      );
      return;
    }

    // Le paiement doit être raccordé à l'API checkout
    // existante avant de créer une commande.
    router.push("/checkout");
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-moshi-bg">
        <Loader2 className="w-8 h-8 animate-spin text-moshi-purple" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-[100dvh] bg-moshi-bg flex flex-col items-center justify-center p-6 text-center">
        <ShoppingBag className="w-14 h-14 text-gray-300 mb-4" />

        <h1 className="text-xl font-extrabold">
          Connecte-toi pour accéder à ton panier
        </h1>

        <p className="text-sm text-gray-500 mt-2">
          Retrouve tes produits et continue tes achats.
        </p>

        <Link
          href="/auth/login"
          className="moshi-gradient text-white font-bold rounded-xl px-6 py-3 mt-6"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-moshi-bg pb-44">
      <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            aria-label="Retour"
            className="p-1"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div className="flex-1">
            <h1 className="text-lg font-extrabold">
              Mon panier
            </h1>

            <p className="text-xs text-gray-500">
              {items.length} produit(s)
            </p>
          </div>

          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs font-semibold text-red-500"
            >
              Vider
            </button>
          )}
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-5">
        {items.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center mt-8">
            <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center mx-auto">
              <ShoppingCart className="w-9 h-9 text-moshi-purple" />
            </div>

            <h2 className="font-extrabold text-lg mt-5">
              Ton panier est vide
            </h2>

            <p className="text-sm text-gray-500 mt-2">
              Découvre les produits proposés par les vendeurs Moshi.
            </p>

            <Link
              href="/shop"
              className="inline-flex items-center justify-center gap-2 moshi-gradient text-white font-bold rounded-xl px-6 py-3 mt-6"
            >
              <ShoppingBag size={18} />
              Explorer la boutique
            </Link>
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <section
                key={group.sellerId}
                className="bg-white rounded-2xl overflow-hidden shadow-sm"
              >
                <div className="px-4 py-3 border-b flex items-center gap-2">
                  <Store
                    size={17}
                    className="text-moshi-purple"
                  />

                  <h2 className="text-sm font-bold">
                    Boutique du vendeur
                  </h2>

                  <span className="ml-auto text-xs text-gray-400">
                    {group.items.length} article(s)
                  </span>
                </div>

                <div className="divide-y">
                  {group.items.map((item) => {
                    const unavailable =
                      !item.product.is_active ||
                      item.product.stock < item.quantity;

                    return (
                      <article
                        key={item.id}
                        className="p-4 flex gap-3"
                      >
                        <Link
                          href={`/shop/${item.product.id}`}
                          className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-gray-100"
                        >
                          {item.product.image_url ? (
                            <Image
                              src={item.product.image_url}
                              alt={item.product.title}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Package size={30} />
                            </div>
                          )}
                        </Link>

                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/shop/${item.product.id}`}
                            className="text-sm font-bold line-clamp-2"
                          >
                            {item.product.title}
                          </Link>

                          <p className="text-sm font-extrabold text-moshi-purple mt-1">
                            {Number(
                              item.product.price
                            ).toLocaleString("fr-FR")}{" "}
                            {item.product.currency === "XOF" ||
                            !item.product.currency
                              ? "FCFA"
                              : item.product.currency}
                          </p>

                          {unavailable && (
                            <p className="text-xs text-red-500 mt-1">
                              {item.product.is_active
                                ? `Stock restant : ${item.product.stock}`
                                : "Produit indisponible"}
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center border rounded-lg h-9">
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item,
                                    item.quantity - 1
                                  )
                                }
                                disabled={updating === item.id}
                                className="px-2 h-full"
                                aria-label="Diminuer"
                              >
                                <Minus size={14} />
                              </button>

                              <span className="min-w-7 text-center text-sm font-bold">
                                {item.quantity}
                              </span>

                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item,
                                    item.quantity + 1
                                  )
                                }
                                disabled={
                                  updating === item.id ||
                                  item.quantity >=
                                    item.product.stock
                                }
                                className="px-2 h-full"
                                aria-label="Augmenter"
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            <button
                              onClick={() => removeItem(item)}
                              disabled={updating === item.id}
                              aria-label="Supprimer du panier"
                              className="text-red-500 p-2"
                            >
                              {updating === item.id ? (
                                <Loader2
                                  size={17}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2 size={17} />
                              )}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="px-4 py-3 bg-gray-50 flex justify-between text-sm">
                  <span className="text-gray-500">
                    Sous-total vendeur
                  </span>

                  <strong>
                    {group.subtotal.toLocaleString("fr-FR")} FCFA
                  </strong>
                </div>
              </section>
            ))}
          </>
        )}
      </main>

      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t shadow-lg p-4 pb-safe">
          <div className="max-w-xl mx-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">
                Total des produits
              </span>

              <strong className="text-xl font-extrabold text-moshi-purple">
                {total.toLocaleString("fr-FR")} FCFA
              </strong>
            </div>

            <p className="text-[11px] text-gray-400 mb-3">
              Les frais de paiement CinetPay seront calculés séparément au moment du paiement.
            </p>

            <button
              onClick={checkout}
              className="w-full moshi-gradient text-white font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2"
            >
              <ShoppingBag size={19} />
              Passer au paiement
            </button>

            <Link
              href="/shop"
              className="block text-center text-xs font-semibold text-moshi-purple mt-3"
            >
              Continuer mes achats
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

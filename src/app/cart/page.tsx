"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  AlertCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useMoshiPreferences } from "@/components/providers/MoshiPreferencesProvider";
import { getPrimaryProductImage } from "@/lib/products";

type CartProduct = {
  id: string;
  title: string;
  price: number;
  currency: string;
  images: unknown;
  stock: number;
  seller_id: string;
  status: string;
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
  subtotalXof: number;
};

export default function CartPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const {
    t,
    formatMoney,
    formatXof,
    currency,
    ratesSource,
    ratesSourceUrl,
    rateDate,
    ratesDisclaimer,
    ratesError,
  } = useMoshiPreferences();

  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const loadCart = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setUserId(null);
        setItems([]);
        return;
      }

      setUserId(user.id);

      const { data: cartRows, error: cartError } =
        await supabase
          .from("cart_items")
          .select("id,product_id,quantity")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

      if (cartError) throw cartError;

      if (!cartRows?.length) {
        setItems([]);
        return;
      }

      const productIds = [
        ...new Set(cartRows.map((row) => row.product_id)),
      ];

      const { data: products, error: productError } =
        await supabase
          .from("products")
          .select(
            "id,title,price,currency,images,stock,seller_id,status"
          )
          .in("id", productIds);

      if (productError) throw productError;

      const productMap = new Map(
        (products || []).map((product) => [
          product.id,
          product as CartProduct,
        ])
      );

      const merged: CartItem[] = [];

      for (const row of cartRows) {
        const product = productMap.get(row.product_id);

        if (!product) continue;

        merged.push({
          id: row.id,
          product_id: row.product_id,
          quantity: Number(row.quantity),
          product,
        });
      }

      setItems(merged);
    } catch (error) {
      console.error("Moshi cart:", error);

      setErrorMessage(
        t("Impossible de charger ton panier.")
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, t]);

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
          subtotalXof: 0,
        });
      }

      const group = grouped.get(sellerId)!;

      group.items.push(item);
      group.subtotalXof +=
        Number(item.product.price) * item.quantity;
    }

    return Array.from(grouped.values());
  }, [items]);

  const totalXof = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          Number(item.product.price) * item.quantity,
        0
      ),
    [items]
  );

  const hasUnavailableProducts = useMemo(
    () =>
      items.some(
        (item) =>
          item.product.status !== "active" ||
          item.product.currency !== "XOF" ||
          item.product.stock < item.quantity
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
      setErrorMessage(
        `${t("Stock disponible")} : ${item.product.stock}`
      );
      return;
    }

    setUpdating(item.id);
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("cart_items")
        .update({
          quantity: nextQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id)
        .eq("user_id", userId);

      if (error) throw error;

      setItems((current) =>
        current.map((row) =>
          row.id === item.id
            ? { ...row, quantity: nextQuantity }
            : row
        )
      );
    } catch (error) {
      console.error("Update cart quantity:", error);

      setErrorMessage(
        t("Impossible de modifier la quantité.")
      );
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (item: CartItem) => {
    if (!userId || updating) return;

    setUpdating(item.id);
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", item.id)
        .eq("user_id", userId);

      if (error) throw error;

      setItems((current) =>
        current.filter((row) => row.id !== item.id)
      );
    } catch (error) {
      console.error("Remove cart item:", error);

      setErrorMessage(
        t("Impossible de supprimer ce produit.")
      );
    } finally {
      setUpdating(null);
    }
  };

  const clearCart = async () => {
    if (!userId || !items.length || updating) return;

    if (!window.confirm(t("Vider complètement ton panier ?"))) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      setItems([]);
    } catch (error) {
      console.error("Clear cart:", error);

      setErrorMessage(
        t("Impossible de vider le panier.")
      );
    } finally {
      setLoading(false);
    }
  };

  const checkout = () => {
    if (!items.length) return;

    if (hasUnavailableProducts) {
      setErrorMessage(
        t(
          "Certains produits ne sont plus disponibles ou leur devise n'est pas prise en charge. Mets ton panier à jour avant de continuer."
        )
      );

      return;
    }

    router.push("/checkout");
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-moshi-bg">
        <Loader2 className="h-8 w-8 animate-spin text-moshi-purple" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-moshi-bg p-6 text-center">
        <ShoppingBag className="mb-4 h-14 w-14 text-gray-300" />

        <h1 className="text-xl font-extrabold">
          {t("Connecte-toi pour accéder à ton panier")}
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          {t("Retrouve tes produits et continue tes achats.")}
        </p>

        <Link
          href="/auth/login"
          className="mt-6 rounded-xl moshi-gradient px-6 py-3 font-bold text-white"
        >
          {t("Se connecter")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-moshi-bg pb-48">
      <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={t("Retour")}
            className="p-1"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>

          <div className="flex-1">
            <h1 className="text-lg font-extrabold">
              {t("Mon panier")}
            </h1>

            <p className="text-xs text-gray-500">
              {items.length} {t("produit(s)")}
            </p>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={() => void clearCart()}
              className="text-xs font-semibold text-red-500"
            >
              {t("Vider")}
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-5 p-4">
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {items.length === 0 ? (
          <div className="mt-8 rounded-3xl bg-white p-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-purple-50">
              <ShoppingCart className="h-9 w-9 text-moshi-purple" />
            </div>

            <h2 className="mt-5 text-lg font-extrabold">
              {t("Ton panier est vide")}
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              {t(
                "Découvre les produits proposés par les vendeurs Moshi."
              )}
            </p>

            <Link
              href="/shop"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl moshi-gradient px-6 py-3 font-bold text-white"
            >
              <ShoppingBag size={18} />
              {t("Explorer la boutique")}
            </Link>
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <section
                key={group.sellerId}
                className="overflow-hidden rounded-2xl bg-white shadow-sm"
              >
                <div className="flex items-center gap-2 border-b px-4 py-3">
                  <Store
                    size={17}
                    className="text-moshi-purple"
                  />

                  <h2 className="text-sm font-bold">
                    {t("Boutique du vendeur")}
                  </h2>

                  <span className="ml-auto text-xs text-gray-400">
                    {group.items.length} {t("article(s)")}
                  </span>
                </div>

                <div className="divide-y">
                  {group.items.map((item) => {
                    const unavailable =
                      item.product.status !== "active" ||
                      item.product.currency !== "XOF" ||
                      item.product.stock < item.quantity;

                    const image = getPrimaryProductImage(
                      item.product.images
                    );

                    return (
                      <article
                        key={item.id}
                        className="flex gap-3 p-4"
                      >
                        <Link
                          href={`/shop/${item.product.id}`}
                          className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100"
                        >
                          {image ? (
                            <Image
                              src={image}
                              alt={item.product.title}
                              fill
                              sizes="96px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-gray-300">
                              <Package size={30} />
                            </div>
                          )}
                        </Link>

                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/shop/${item.product.id}`}
                            className="line-clamp-2 text-sm font-bold"
                          >
                            {item.product.title}
                          </Link>

                          <p className="mt-1 text-sm font-extrabold text-moshi-purple">
                            {formatMoney(
                              Number(item.product.price)
                            )}
                          </p>

                          {unavailable && (
                            <p className="mt-1 text-xs text-red-500">
                              {item.product.currency !== "XOF"
                                ? t("Devise du produit non prise en charge")
                                : item.product.status !== "active"
                                  ? t("Produit indisponible")
                                  : `${t("Stock restant")} : ${item.product.stock}`}
                            </p>
                          )}

                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex h-9 items-center rounded-lg border">
                              <button
                                type="button"
                                onClick={() =>
                                  void updateQuantity(
                                    item,
                                    item.quantity - 1
                                  )
                                }
                                disabled={updating === item.id}
                                className="h-full px-2"
                                aria-label={t("Diminuer")}
                              >
                                <Minus size={14} />
                              </button>

                              <span className="min-w-7 text-center text-sm font-bold">
                                {item.quantity}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  void updateQuantity(
                                    item,
                                    item.quantity + 1
                                  )
                                }
                                disabled={
                                  updating === item.id ||
                                  item.quantity >= item.product.stock
                                }
                                className="h-full px-2"
                                aria-label={t("Augmenter")}
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                void removeItem(item)
                              }
                              disabled={updating === item.id}
                              aria-label={t("Supprimer du panier")}
                              className="p-2 text-red-500"
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

                <div className="flex justify-between bg-gray-50 px-4 py-3 text-sm">
                  <span className="text-gray-500">
                    {t("Sous-total vendeur")}
                  </span>

                  <strong>
                    {formatMoney(group.subtotalXof)}
                  </strong>
                </div>
              </section>
            ))}
          </>
        )}
      </main>

      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-white p-4 pb-safe shadow-lg">
          <div className="mx-auto max-w-xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {t("Total des produits")}
              </span>

              <strong className="text-xl font-extrabold text-moshi-purple">
                {formatMoney(totalXof)}
              </strong>
            </div>

            <div className="mb-3 rounded-xl bg-purple-50 p-3">
              <p className="text-[11px] font-semibold text-purple-800">
                {t("Montant exact débité en XOF")}
              </p>

              <p className="mt-1 text-lg font-extrabold text-purple-950">
                {formatXof(totalXof)}
              </p>

              {currency !== "XOF" && (
                <p className="mt-2 text-[10px] leading-5 text-purple-800">
                  {t(ratesDisclaimer)}
                  {" "}
                  {rateDate
                    ? `${t("Taux mis à jour le")} ${rateDate}.`
                    : ""}
                  {" "}
                  {ratesSourceUrl && (
                    <a
                      href={ratesSourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold underline"
                    >
                      {ratesSource}
                    </a>
                  )}
                  {ratesError
                    ? ` ${t("Conversion indisponible.")}`
                    : ""}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={checkout}
              disabled={hasUnavailableProducts}
              className="flex w-full items-center justify-center gap-2 rounded-2xl moshi-gradient py-4 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingBag size={19} />
              {t("Passer au paiement")}
            </button>

            <Link
              href="/shop"
              className="mt-3 block text-center text-xs font-semibold text-moshi-purple"
            >
              {t("Continuer mes achats")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Package,
  Loader2,
  CheckCircle,
  Truck,
  Clock,
  ShoppingBag,
  RefreshCw,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useMoshiPreferences } from "@/components/providers/MoshiPreferencesProvider";

type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "disputed";

type ProductImage = {
  key?: string;
  url?: string;
} | string;

type OrderItem = {
  id: string;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_snapshot: {
    title?: string;
    description?: string;
    images?: ProductImage[];
  } | null;
};

type BuyerProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type Order = {
  id: string;
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  shipping_fee: number;
  total: number;
  currency: string;
  shipping_address: Record<string, unknown> | null;
  created_at: string;
  buyer_id: string;
  items: OrderItem[];
  buyer: BuyerProfile | null;
};

const TABS: {
  id: OrderStatus;
  label: string;
  icon: typeof Clock;
}[] = [
  { id: "pending", label: "En attente", icon: Clock },
  { id: "paid", label: "Payées", icon: CheckCircle },
  { id: "processing", label: "Préparation", icon: Package },
  { id: "shipped", label: "Expédiées", icon: Truck },
  { id: "delivered", label: "Livrées", icon: CheckCircle },
];

function getImageUrl(images: ProductImage[] | undefined): string | null {
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

function getBuyerName(buyer: BuyerProfile | null): string {
  return (
    buyer?.username ||
    buyer?.full_name ||
    "Client Moshi"
  );
}

function getAddressLabel(
  address: Record<string, unknown> | null
): string {
  if (!address) return "Adresse non renseignée";

  const parts = [
    address.full_name,
    address.address,
    address.city,
    address.country,
    address.phone,
  ]
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0
    );

  return parts.length
    ? parts.join(" · ")
    : "Adresse non renseignée";
}

export default function SellerOrdersPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { formatMoney } = useMoshiPreferences();

  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<OrderStatus>("paid");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.push("/auth/login");
      return;
    }

    const { data: orderRows, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        subtotal,
        shipping_fee,
        total,
        currency,
        shipping_address,
        created_at,
        buyer_id,
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          total_price,
          product_snapshot
        )
      `)
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Chargement des commandes vendeur :", ordersError);
      throw ordersError;
    }

    const rows = orderRows || [];
    const buyerIds = [
      ...new Set(rows.map((order) => order.buyer_id).filter(Boolean)),
    ];

    let buyersMap: Record<string, BuyerProfile> = {};

    if (buyerIds.length > 0) {
      const { data: buyers, error: buyersError } = await supabase
        .from("profiles")
        .select("id,username,full_name,avatar_url")
        .in("id", buyerIds);

      if (buyersError) {
        console.error("Chargement des acheteurs :", buyersError);
      }

      for (const buyer of buyers || []) {
        buyersMap[buyer.id] = buyer as BuyerProfile;
      }
    }

    const formatted: Order[] = rows.map((row: any) => ({
      id: row.id,
      order_number: row.order_number,
      status: row.status,
      subtotal: Number(row.subtotal || 0),
      shipping_fee: Number(row.shipping_fee || 0),
      total: Number(row.total || 0),
      currency: row.currency || "XOF",
      shipping_address: row.shipping_address || null,
      created_at: row.created_at,
      buyer_id: row.buyer_id,
      items: Array.isArray(row.order_items)
        ? row.order_items.map((item: any) => ({
            ...item,
            quantity: Number(item.quantity || 0),
            unit_price: Number(item.unit_price || 0),
            total_price: Number(item.total_price || 0),
          }))
        : [],
      buyer: buyersMap[row.buyer_id] || null,
    }));

    setOrders(formatted);
  }, [router, supabase]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);

      try {
        await loadOrders();
      } catch (error) {
        console.error(error);
      } finally {
        if (active) setLoading(false);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [loadOrders]);

  const refresh = async () => {
    setRefreshing(true);

    try {
      await loadOrders();
    } catch (error: any) {
      alert(error?.message || "Impossible d'actualiser les commandes.");
    } finally {
      setRefreshing(false);
    }
  };

  const updateStatus = async (
    orderId: string,
    nextStatus: "processing" | "shipped" | "delivered"
  ) => {
    if (updatingId) return;

    setUpdatingId(orderId);

    try {
      const { error } = await supabase.rpc(
        "seller_update_order_status",
        {
          p_order_id: orderId,
          p_new_status: nextStatus,
        }
      );

      if (error) throw error;

      setOrders((current) =>
        current.map((order) =>
          order.id === orderId
            ? { ...order, status: nextStatus }
            : order
        )
      );
    } catch (error: any) {
      console.error("Modification du statut :", error);
      alert(
        error?.message ||
          "Impossible de modifier le statut de cette commande."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = orders.filter(
    (order) => order.status === activeTab
  );

  const getNextAction = (status: OrderStatus) => {
    if (status === "paid") {
      return {
        label: "Commencer la préparation",
        next: "processing" as const,
        icon: Package,
        style: "bg-blue-600 hover:bg-blue-700",
      };
    }

    if (status === "processing") {
      return {
        label: "Marquer comme expédiée",
        next: "shipped" as const,
        icon: Truck,
        style: "bg-purple-600 hover:bg-purple-700",
      };
    }

    if (status === "shipped") {
      return {
        label: "Confirmer la livraison",
        next: "delivered" as const,
        icon: CheckCircle,
        style: "bg-green-600 hover:bg-green-700",
      };
    }

    return null;
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-9 h-9 animate-spin text-moshi-purple" />
      </div>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-moshi-bg pb-12">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Retour"
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center"
          >
            <ArrowLeft size={19} />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-extrabold text-gray-900">
              Mes commandes
            </h1>
            <p className="text-xs text-gray-500">
              Suivi des ventes de ta boutique
            </p>
          </div>

          <button
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
            aria-label="Actualiser"
            className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={refreshing ? "animate-spin" : ""}
            />
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto">
        <div className="grid grid-cols-3 sm:grid-cols-5 bg-white border-b border-gray-100">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const count = orders.filter(
              (order) => order.status === tab.id
            ).length;
            const selected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center gap-1 px-1 py-3 border-b-2 ${
                  selected
                    ? "border-moshi-purple text-moshi-purple"
                    : "border-transparent text-gray-400"
                }`}
              >
                <Icon size={18} />
                <span className="text-[10px] font-bold">
                  {tab.label}
                </span>
                {count > 0 && (
                  <span className="text-[9px] font-extrabold rounded-full bg-gray-100 text-gray-700 px-1.5 py-0.5">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <section className="p-4 space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 flex flex-col items-center text-center gap-3">
              <ShoppingBag className="w-11 h-11 text-gray-300" />
              <p className="font-bold text-gray-700">
                Aucune commande dans cette catégorie
              </p>
              <p className="text-xs text-gray-500">
                Les nouvelles commandes apparaîtront ici après leur
                confirmation.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const buyerName = getBuyerName(order.buyer);
              const action = getNextAction(order.status);

              return (
                <article
                  key={order.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-100 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 font-semibold">
                        COMMANDE
                      </p>
                      <p className="text-sm font-extrabold text-gray-900 break-all">
                        {order.order_number}
                      </p>
                      <p className="mt-1 text-[10px] text-gray-400">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-purple-50 text-moshi-purple px-2.5 py-1 text-[10px] font-bold">
                      {TABS.find((tab) => tab.id === order.status)?.label ||
                        order.status}
                    </span>
                  </div>

                  <div className="p-4 space-y-3">
                    {order.items.map((item) => {
                      const title =
                        item.product_snapshot?.title ||
                        "Produit Moshi";

                      const imageUrl = getImageUrl(
                        item.product_snapshot?.images
                      );

                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3"
                        >
                          <div className="relative w-14 h-14 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                            {imageUrl ? (
                              <Image
                                src={imageUrl}
                                alt={title}
                                fill
                                sizes="56px"
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <Package className="absolute inset-0 m-auto text-gray-300" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">
                              {title}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Quantité : {item.quantity}
                            </p>
                            <p className="text-xs font-bold text-moshi-purple mt-1">
                              {formatMoney(item.total_price, "XOF")}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mx-4 border-t border-dashed border-gray-200" />

                  <div className="p-4 space-y-2">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Sous-total</span>
                      <span>{formatMoney(order.subtotal, "XOF")}</span>
                    </div>

                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Livraison</span>
                      <span>{formatMoney(order.shipping_fee, "XOF")}</span>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span className="text-sm font-extrabold text-gray-900">
                        Total payé
                      </span>
                      <span className="text-base font-extrabold text-moshi-purple">
                        {formatMoney(order.total, "XOF")}
                      </span>
                    </div>
                  </div>

                  <div className="mx-4 border-t border-gray-100" />

                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-purple-50 overflow-hidden shrink-0 relative">
                        {order.buyer?.avatar_url ? (
                          <Image
                            src={order.buyer.avatar_url}
                            alt={buyerName}
                            fill
                            sizes="36px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-moshi-purple">
                            {buyerName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs text-gray-400">
                          Acheteur
                        </p>
                        <p className="text-sm font-bold text-gray-800 truncate">
                          {buyerName}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-[10px] font-bold text-gray-500 mb-1">
                        ADRESSE DE LIVRAISON
                      </p>
                      <p className="text-xs leading-relaxed text-gray-700">
                        {getAddressLabel(order.shipping_address)}
                      </p>
                    </div>

                    {action && (
                      <button
                        type="button"
                        onClick={() =>
                          void updateStatus(order.id, action.next)
                        }
                        disabled={updatingId === order.id}
                        className={`w-full rounded-xl py-3 px-4 text-xs font-extrabold text-white flex items-center justify-center gap-2 disabled:opacity-50 ${action.style}`}
                      >
                        {updatingId === order.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <action.icon size={16} />
                        )}
                        {action.label}
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  MapPin,
  Phone,
  User,
  ShoppingBag,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Store,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useMoshiPreferences } from "@/components/providers/MoshiPreferencesProvider";
import { getPrimaryProductImage } from "@/lib/products";

type Product = {
  id: string;
  title: string;
  price: number;
  currency: string;
  images: unknown;
  stock: number;
  seller_id: string;
  status: string;
};

type CheckoutItem = {
  id: string;
  product_id: string;
  quantity: number;
  product: Product;
};

export default function CheckoutPage() {
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

  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("Togo");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [instructions, setInstructions] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

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

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) throw profileError;

      if (profile) {
        setFullName(
          profile.full_name || profile.username || ""
        );

        setPhone(profile.phone || "");
        setCountry(profile.country || "Togo");
        setCity(profile.city || "");
        setAddress(profile.address || "");
      }

      const { data: cart, error: cartError } =
        await supabase
          .from("cart_items")
          .select("id,product_id,quantity")
          .eq("user_id", user.id);

      if (cartError) throw cartError;

      if (!cart?.length) {
        setItems([]);
        return;
      }

      const ids = [
        ...new Set(cart.map((item) => item.product_id)),
      ];

      const { data: products, error: productError } =
        await supabase
          .from("products")
          .select(
            "id,title,price,currency,images,stock,seller_id,status"
          )
          .in("id", ids);

      if (productError) throw productError;

      const productMap = new Map(
        (products || []).map((product) => [
          product.id,
          product as Product,
        ])
      );

      const result: CheckoutItem[] = [];

      for (const item of cart) {
        const product = productMap.get(item.product_id);

        if (!product) continue;

        result.push({
          id: item.id,
          product_id: item.product_id,
          quantity: Number(item.quantity),
          product,
        });
      }

      setItems(result);
    } catch (error) {
      console.error("Checkout load:", error);

      setErrorMessage(
        t("Impossible de charger les informations du panier.")
      );
    } finally {
      setLoading(false);
    }
  }, [router, supabase, t]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const sellerCount = useMemo(
    () =>
      new Set(items.map((item) => item.product.seller_id))
        .size,
    [items]
  );

  const unavailable = useMemo(
    () =>
      items.some(
        (item) =>
          item.product.status !== "active" ||
          item.product.currency !== "XOF" ||
          item.product.stock < item.quantity
      ),
    [items]
  );

  const validate = () => {
    if (!fullName.trim()) {
      setErrorMessage(t("Saisis ton nom complet."));
      return false;
    }

    if (!phone.trim()) {
      setErrorMessage(
        t("Saisis ton numéro de téléphone.")
      );
      return false;
    }

    if (!country.trim()) {
      setErrorMessage(t("Sélectionne ton pays."));
      return false;
    }

    if (!city.trim()) {
      setErrorMessage(t("Saisis ta ville."));
      return false;
    }

    if (!address.trim()) {
      setErrorMessage(
        t("Saisis ton adresse de livraison.")
      );
      return false;
    }

    if (!items.length) {
      setErrorMessage(t("Ton panier est vide."));
      return false;
    }

    if (unavailable) {
      setErrorMessage(
        t(
          "Un ou plusieurs produits ne sont plus disponibles. Retourne dans ton panier pour les corriger."
        )
      );

      return false;
    }

    if (
      !Number.isSafeInteger(totalXof) ||
      totalXof < 100 ||
      totalXof > 2500000
    ) {
      setErrorMessage(
        t(
          "Le montant doit être compris entre 100 et 2 500 000 XOF."
        )
      );

      return false;
    }

    return true;
  };

  const startPayment = async () => {
    setErrorMessage("");

    if (!validate() || submitting) return;

    setSubmitting(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shipping: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            country: country.trim(),
            city: city.trim(),
            address: address.trim(),
            instructions: instructions.trim(),
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            t("Impossible de démarrer le paiement.")
        );
      }

      if (!result.payment_url) {
        throw new Error(
          t("Le serveur n'a pas retourné de lien de paiement.")
        );
      }

      window.location.assign(result.payment_url);
    } catch (error) {
      console.error("Checkout payment:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : t(
              "Une erreur est survenue pendant la préparation du paiement."
            )
      );

      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-moshi-bg">
        <Loader2 className="h-8 w-8 animate-spin text-moshi-purple" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-moshi-bg p-6 text-center">
        <ShoppingBag className="mb-4 h-14 w-14 text-gray-300" />

        <h1 className="text-xl font-extrabold">
          {t("Aucun produit à payer")}
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          {t(
            "Ajoute des produits à ton panier avant de continuer."
          )}
        </p>

        <Link
          href="/shop"
          className="mt-6 rounded-xl moshi-gradient px-6 py-3 font-bold text-white"
        >
          {t("Explorer la boutique")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-moshi-bg pb-36">
      <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={t("Retour")}
          >
            <ArrowLeft className="h-6 w-6" />
          </button>

          <div>
            <h1 className="text-lg font-extrabold">
              {t("Finaliser ma commande")}
            </h1>

            <p className="text-xs text-gray-500">
              {t("Dernière étape avant le paiement")}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-5 p-4">
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <section className="space-y-4 rounded-2xl bg-white p-4">
          <div className="flex items-center gap-2">
            <MapPin
              className="text-moshi-purple"
              size={20}
            />

            <h2 className="font-extrabold">
              {t("Adresse de livraison")}
            </h2>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">
              {t("Nom complet")}
            </label>

            <div className="relative mt-1">
              <User
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={fullName}
                onChange={(event) =>
                  setFullName(event.target.value)
                }
                placeholder={t("Ton nom complet")}
                autoComplete="name"
                className="w-full rounded-xl border py-3 pl-10 pr-3 text-sm outline-none focus:border-moshi-purple"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">
              {t("Téléphone")}
            </label>

            <div className="relative mt-1">
              <Phone
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value)
                }
                placeholder="+228..."
                autoComplete="tel"
                inputMode="tel"
                className="w-full rounded-xl border py-3 pl-10 pr-3 text-sm outline-none focus:border-moshi-purple"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">
              {t("Pays")}
            </label>

            <input
              value={country}
              onChange={(event) =>
                setCountry(event.target.value)
              }
              autoComplete="country-name"
              className="mt-1 w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-moshi-purple"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">
              {t("Ville")}
            </label>

            <input
              value={city}
              onChange={(event) =>
                setCity(event.target.value)
              }
              autoComplete="address-level2"
              className="mt-1 w-full rounded-xl border px-3 py-3 text-sm outline-none focus:border-moshi-purple"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">
              {t("Adresse")}
            </label>

            <textarea
              value={address}
              onChange={(event) =>
                setAddress(event.target.value)
              }
              rows={3}
              autoComplete="street-address"
              className="mt-1 w-full resize-none rounded-xl border px-3 py-3 text-sm outline-none focus:border-moshi-purple"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">
              {t("Instructions de livraison")} (
              {t("facultatif")})
            </label>

            <textarea
              value={instructions}
              onChange={(event) =>
                setInstructions(event.target.value)
              }
              rows={2}
              className="mt-1 w-full resize-none rounded-xl border px-3 py-3 text-sm outline-none focus:border-moshi-purple"
            />
          </div>
        </section>

        <section className="space-y-4 rounded-2xl bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold">
              {t("Récapitulatif")}
            </h2>

            <span className="text-xs text-gray-500">
              {items.length} {t("produit(s)")}
            </span>
          </div>

          <div className="space-y-3">
            {items.map((item) => {
              const image = getPrimaryProductImage(
                item.product.images
              );

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                    {image ? (
                      <Image
                        src={image}
                        alt={item.product.title}
                        fill
                        sizes="64px"
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-gray-300" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-900">
                      {item.product.title}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {t("Quantité")}: {item.quantity}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-moshi-purple">
                      {formatMoney(
                        Number(item.product.price)
                      )}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-extrabold text-gray-900">
                    {formatMoney(
                      Number(item.product.price) *
                        item.quantity
                    )}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{t("Nombre de boutiques")}</span>
              <span className="font-semibold text-gray-900">
                {sellerCount}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {t("Sous-total produits")}
              </span>

              <span className="font-bold text-gray-900">
                {formatMoney(totalXof)}
              </span>
            </div>

            <div className="mt-4 rounded-xl bg-purple-50 p-4">
              <p className="text-xs font-semibold text-purple-800">
                {t("Total produits")}
              </p>

              <p className="mt-1 text-2xl font-extrabold text-purple-900">
                {formatMoney(totalXof)}
              </p>

              <div className="mt-3 border-t border-purple-100 pt-3">
                <p className="text-xs font-semibold text-gray-700">
                  {t("Montant exact débité en XOF")}
                </p>

                <p className="mt-1 text-lg font-extrabold text-gray-900">
                  {formatXof(totalXof)}
                </p>
              </div>

              {currency !== "XOF" && (
                <p className="mt-3 text-[11px] leading-5 text-purple-800">
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
                  {ratesError ? ` ${t("Conversion indisponible.")}` : ""}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-green-100 bg-green-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-green-600">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-bold text-green-900">
                {t("Paiement sécurisé Moshi")}
              </p>

              <p className="mt-1 text-xs text-green-800">
                {t("Paiement via CinetPay en XOF.")}
              </p>
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={() => void startPayment()}
          disabled={submitting || unavailable}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl moshi-gradient px-5 py-4 text-sm font-extrabold text-white shadow-lg shadow-purple-200/50 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {t("Préparation du paiement...")}
            </>
          ) : (
            <>
              <Store className="h-5 w-5" />
              {t("Continuer vers le paiement")}
            </>
          )}
        </button>

        <p className="text-center text-[11px] leading-5 text-gray-400">
          {t(
            "Le montant final est recalculé sur le serveur avant la redirection vers CinetPay."
          )}
        </p>
      </main>
    </div>
  );
}
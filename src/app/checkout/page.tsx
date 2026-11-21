
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: string;
  title: string;
  price: number;
  currency: string;
  image_url: string | null;
  stock: number;
  seller_id: string;
  is_active: boolean;
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

  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("Togo");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [instructions, setInstructions] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        router.replace("/auth/login");
        return;
      }

      setUserId(auth.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();

      if (profile) {
        setFullName(
          profile.full_name ||
          profile.username ||
          ""
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
          .eq("user_id", auth.user.id);

      if (cartError) throw cartError;

      if (!cart?.length) {
        setItems([]);
        return;
      }

      const ids = cart.map((item) => item.product_id);

      const { data: products, error: productError } =
        await supabase
          .from("products")
          .select(
            "id,title,price,currency,image_url,stock,seller_id,is_active"
          )
          .in("id", ids);

      if (productError) throw productError;

      const productMap = new Map(
        (products || []).map((product) => [
          product.id,
          product,
        ])
      );

      const result = cart
        .map((item) => {
          const product = productMap.get(item.product_id);

          if (!product) return null;

          return {
            id: item.id,
            product_id: item.product_id,
            quantity: item.quantity,
            product,
          };
        })
        .filter(Boolean) as CheckoutItem[];

      setItems(result);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        "Impossible de charger les informations du panier."
      );
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const sellerCount = useMemo(
    () =>
      new Set(items.map((item) => item.product.seller_id))
        .size,
    [items]
  );

  const validate = () => {
    if (!fullName.trim()) {
      setErrorMessage("Saisis ton nom complet.");
      return false;
    }

    if (!phone.trim()) {
      setErrorMessage("Saisis ton numéro de téléphone.");
      return false;
    }

    if (!country.trim()) {
      setErrorMessage("Sélectionne ton pays.");
      return false;
    }

    if (!city.trim()) {
      setErrorMessage("Saisis ta ville.");
      return false;
    }

    if (!address.trim()) {
      setErrorMessage("Saisis ton adresse de livraison.");
      return false;
    }

    if (!items.length) {
      setErrorMessage("Ton panier est vide.");
      return false;
    }

    const unavailable = items.some(
      (item) =>
        !item.product.is_active ||
        item.product.stock < item.quantity
    );

    if (unavailable) {
      setErrorMessage(
        "Un ou plusieurs produits ne sont plus disponibles. Retourne dans ton panier pour les corriger."
      );
      return false;
    }

    return true;
  };

  const startPayment = async () => {
    setErrorMessage("");

    if (!validate()) return;
    if (!userId || submitting) return;

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
          "Impossible de démarrer le paiement."
        );
      }

      if (!result.payment_url) {
        throw new Error(
          "Le serveur n'a pas retourné de lien de paiement."
        );
      }

      window.location.assign(result.payment_url);
    } catch (error: any) {
      setErrorMessage(
        error.message ||
        "Une erreur est survenue pendant la préparation du paiement."
      );
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-moshi-bg">
        <Loader2 className="w-8 h-8 animate-spin text-moshi-purple" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="min-h-[100dvh] bg-moshi-bg p-6 flex flex-col items-center justify-center text-center">
        <ShoppingBag className="w-14 h-14 text-gray-300 mb-4" />

        <h1 className="text-xl font-extrabold">
          Aucun produit à payer
        </h1>

        <p className="text-sm text-gray-500 mt-2">
          Ajoute des produits à ton panier avant de continuer.
        </p>

        <Link
          href="/shop"
          className="moshi-gradient text-white font-bold rounded-xl px-6 py-3 mt-6"
        >
          Découvrir la boutique
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-moshi-bg pb-36">
      <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            aria-label="Retour"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div>
            <h1 className="font-extrabold text-lg">
              Finaliser ma commande
            </h1>

            <p className="text-xs text-gray-500">
              Dernière étape avant le paiement
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-5">
        <section className="bg-white rounded-2xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="text-moshi-purple" size={20} />
            <h2 className="font-extrabold">
              Adresse de livraison
            </h2>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">
              Nom complet
            </label>

            <div className="relative mt-1">
              <User
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ton nom complet"
                className="w-full border rounded-xl py-3 pl-10 pr-3 text-sm outline-none focus:border-moshi-purple"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">
              Téléphone
            </label>

            <div className="relative mt-1">
              <Phone
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+228 90 00 00 00"
                className="w-full border rounded-xl py-3 pl-10 pr-3 text-sm outline-none focus:border-moshi-purple"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">
              Pays
            </label>

            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full border rounded-xl p-3 mt-1 text-sm bg-white outline-none focus:border-moshi-purple"
            >
              <option value="Togo">Togo</option>
              <option value="Bénin">Bénin</option>
              <option value="Ghana">Ghana</option>
              <option value="Côte d'Ivoire">Côte d'Ivoire</option>
              <option value="Burkina Faso">Burkina Faso</option>
              <option value="Sénégal">Sénégal</option>
              <option value="Mali">Mali</option>
              <option value="Niger">Niger</option>
              <option value="Nigeria">Nigeria</option>
              <option value="Cameroun">Cameroun</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">
              Ville
            </label>

            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ville de livraison"
              className="w-full border rounded-xl p-3 mt-1 text-sm outline-none focus:border-moshi-purple"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">
              Adresse précise
            </label>

            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              placeholder="Quartier, rue, repère..."
              className="w-full border rounded-xl p-3 mt-1 text-sm outline-none resize-none focus:border-moshi-purple"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">
              Instructions complémentaires (facultatif)
            </label>

            <textarea
              value={instructions}
              onChange={(e) =>
                setInstructions(e.target.value)
              }
              rows={2}
              placeholder="Informations utiles pour le livreur..."
              className="w-full border rounded-xl p-3 mt-1 text-sm outline-none resize-none focus:border-moshi-purple"
            />
          </div>
        </section>

        <section className="bg-white rounded-2xl p-4">
          <h2 className="font-extrabold mb-3">
            Récapitulatif
          </h2>

          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3"
              >
                <div className="relative w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                  {item.product.image_url && (
                    <Image
                      src={item.product.image_url}
                      alt={item.product.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold line-clamp-1">
                    {item.product.title}
                  </p>

                  <p className="text-xs text-gray-500">
                    Quantité : {item.quantity}
                  </p>
                </div>

                <p className="text-sm font-bold whitespace-nowrap">
                  {(
                    Number(item.product.price) *
                    item.quantity
                  ).toLocaleString("fr-FR")}{" "}
                  FCFA
                </p>
              </div>
            ))}
          </div>

          <div className="border-t mt-4 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Nombre de boutiques
              </span>

              <strong>{sellerCount}</strong>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Sous-total produits
              </span>

              <strong>
                {total.toLocaleString("fr-FR")} FCFA
              </strong>
            </div>

            <p className="text-xs text-gray-400">
              Les frais de livraison éventuels et les frais CinetPay seront indiqués avant la validation définitive du paiement.
            </p>
          </div>
        </section>

        <section className="bg-purple-50 rounded-2xl p-4 flex gap-3">
          <ShieldCheck
            className="text-moshi-purple shrink-0"
            size={23}
          />

          <div>
            <h3 className="text-sm font-bold">
              Paiement sécurisé Moshi
            </h3>

            <p className="text-xs text-gray-600 mt-1">
              Le paiement doit être confirmé par le serveur avant la création et la confirmation des commandes auprès des vendeurs.
            </p>
          </div>
        </section>

        {errorMessage && (
          <div className="rounded-xl bg-red-50 text-red-600 p-3 flex gap-2 text-sm">
            <AlertCircle
              size={18}
              className="shrink-0"
            />
            {errorMessage}
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 pb-safe z-30">
        <div className="max-w-xl mx-auto">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-gray-500">
              Total produits
            </span>

            <strong className="text-xl font-extrabold text-moshi-purple">
              {total.toLocaleString("fr-FR")} FCFA
            </strong>
          </div>

          <button
            onClick={startPayment}
            disabled={submitting}
            className="w-full moshi-gradient text-white font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2
                  size={19}
                  className="animate-spin"
                />
                Préparation...
              </>
            ) : (
              <>
                <ShieldCheck size={19} />
                Continuer vers le paiement
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

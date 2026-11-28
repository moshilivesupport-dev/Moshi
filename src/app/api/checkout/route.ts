import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  isMoshiCurrency,
  convertXof,
} from "@/lib/currency";

import { getXofDisplayRates } from "@/lib/currency-rates";

import {
  createCinetPayClient,
  getMoshiPublicUrl,
  normalizeTogoPhone,
  hashNotifyToken,
} from "@/lib/payments/cinetpay";

export const dynamic = "force-dynamic";

type ShippingInput = {
  full_name?: string;
  phone?: string;
  country?: string;
  city?: string;
  address?: string;
  instructions?: string;
};

type ProductRow = {
  id: string;
  seller_id: string;
  title: string;
  price: number | string;
  currency: string;
  stock: number;
  status: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

function splitCustomerName(fullName: string) {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  let firstName = parts[0] || "Moshi";
  let lastName = parts.slice(1).join(" ") || "Client";

  if (firstName.length < 2) firstName = "Moshi";
  if (lastName.length < 2) lastName = "Client";

  return {
    firstName: firstName.slice(0, 255),
    lastName: lastName.slice(0, 255),
  };
}

export async function POST(request: Request) {
  let paymentId: string | null = null;
  let merchantTransactionId: string | null = null;

  try {
    const userClient = await createClient();

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonError("Connecte-toi pour passer commande.", 401);
    }

    if (!user.email) {
      return jsonError(
        "Une adresse e-mail valide est nécessaire pour le paiement.",
        400
      );
    }

    let body: { shipping?: ShippingInput };

    try {
      body = await request.json();
    } catch {
      return jsonError("Données de commande invalides.");
    }

    const shipping = body.shipping;

    if (!shipping) {
      return jsonError("Adresse de livraison manquante.");
    }

    const fullName = String(shipping.full_name || "").trim();
    const phone = String(shipping.phone || "").trim();
    const country = String(shipping.country || "").trim();
    const city = String(shipping.city || "").trim();
    const address = String(shipping.address || "").trim();
    const instructions = String(
      shipping.instructions || ""
    ).trim();

    if (fullName.length < 2) {
      return jsonError("Saisis ton nom complet.");
    }

    if (phone.length < 5) {
      return jsonError("Numéro de téléphone invalide.");
    }

    if (!country || !city || address.length < 3) {
      return jsonError(
        "Complète ton pays, ta ville et ton adresse de livraison."
      );
    }

    if (
      fullName.length > 160 ||
      phone.length > 40 ||
      country.length > 100 ||
      city.length > 120 ||
      address.length > 500 ||
      instructions.length > 1000
    ) {
      return jsonError("Certaines informations sont trop longues.");
    }

    const adminClient = createAdminClient();

    const { data: profile, error: profileError } =
      await adminClient
        .from("profiles")
        .select(
          "full_name,username,phone,country,preferred_language,preferred_currency"
        )
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error("Checkout profile:", profileError);
      return jsonError(
        "Impossible de charger ton profil.",
        500
      );
    }

    const displayCurrency = isMoshiCurrency(
      profile?.preferred_currency
    )
      ? profile.preferred_currency
      : "XOF";

    const language =
      profile?.preferred_language === "en" ? "en" : "fr";

    const { data: cartItems, error: cartError } =
      await adminClient
        .from("cart_items")
        .select("product_id,quantity")
        .eq("user_id", user.id);

    if (cartError) {
      console.error("Checkout cart:", cartError);
      return jsonError(
        "Impossible de charger ton panier.",
        500
      );
    }

    if (!cartItems?.length) {
      return jsonError("Ton panier est vide.", 400);
    }

    if (cartItems.length > 100) {
      return jsonError(
        "Ton panier contient trop de produits.",
        400
      );
    }

    const productIds = [
      ...new Set(cartItems.map((item) => item.product_id)),
    ];

    const { data: products, error: productsError } =
      await adminClient
        .from("products")
        .select(
          "id,seller_id,title,price,currency,stock,status"
        )
        .in("id", productIds);

    if (productsError) {
      console.error("Checkout products:", productsError);
      return jsonError(
        "Impossible de vérifier les produits.",
        500
      );
    }

    const productMap = new Map<string, ProductRow>(
      (products || []).map((product) => [
        product.id,
        product as ProductRow,
      ])
    );

    let amountXof = 0;

    for (const item of cartItems) {
      const product = productMap.get(item.product_id);
      const quantity = Number(item.quantity);

      if (!product) {
        return jsonError(
          "Un produit de ton panier n'existe plus.",
          409
        );
      }

      if (product.status !== "active") {
        return jsonError(
          `Le produit "${product.title}" n'est plus disponible.`,
          409
        );
      }

      if (product.currency !== "XOF") {
        return jsonError(
          `Le produit "${product.title}" n'utilise pas la devise de base XOF.`,
          409
        );
      }

      const price = Number(product.price);
      const stock = Number(product.stock);

      if (
        !Number.isFinite(price) ||
        price <= 0 ||
        !Number.isInteger(price)
      ) {
        return jsonError(
          `Le prix du produit "${product.title}" est invalide.`,
          409
        );
      }

      if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        stock < quantity
      ) {
        return jsonError(
          `Stock insuffisant pour "${product.title}".`,
          409
        );
      }

      if (product.seller_id === user.id) {
        return jsonError(
          "Tu ne peux pas acheter ton propre produit.",
          400
        );
      }

      amountXof += price * quantity;
    }

    if (
      !Number.isSafeInteger(amountXof) ||
      amountXof < 100 ||
      amountXof > 2500000
    ) {
      return jsonError(
        "Le montant total doit être compris entre 100 et 2 500 000 XOF.",
        400
      );
    }

    /*
     * Évite de créer plusieurs paiements simultanés
     * pour le même panier.
     */
    const { data: pendingPayment, error: pendingError } =
      await adminClient
        .from("checkout_payments")
        .select(
          "id,merchant_transaction_id,payment_url,created_at"
        )
        .eq("buyer_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (pendingError) {
      console.error("Checkout pending payment:", pendingError);
      return jsonError(
        "Impossible de vérifier les paiements en cours.",
        500
      );
    }

    if (pendingPayment) {
      const age =
        Date.now() -
        new Date(pendingPayment.created_at).getTime();

      const maxAge = 15 * 60 * 1000;

      if (age < maxAge) {
        if (pendingPayment.payment_url) {
          return NextResponse.json({
            success: true,
            payment_url: pendingPayment.payment_url,
            reference:
              pendingPayment.merchant_transaction_id,
            resumed: true,
          });
        }

        return jsonError(
          "Un paiement est déjà en préparation. Réessaie dans quelques instants.",
          409
        );
      }

      await adminClient.rpc("fail_checkout_payment", {
        p_merchant_transaction_id:
          pendingPayment.merchant_transaction_id,
        p_status: "expired",
      });
    }

    let displayTotal: number | null = null;
    let rateDate: string | null = null;
    let rateSource: string | null = null;

    if (displayCurrency === "XOF") {
      displayTotal = amountXof;
    } else {
      try {
        const rateData = await getXofDisplayRates();

        displayTotal = convertXof(
          amountXof,
          displayCurrency,
          rateData.rates
        );

        rateDate = rateData.rateDate;
        rateSource = rateData.source;
      } catch (error) {
        console.error(
          "Checkout display currency conversion:",
          error
        );

        /*
         * La conversion d'affichage n'est pas indispensable
         * au paiement. Le paiement reste calculé en XOF.
         */
        displayTotal = null;
      }
    }

    merchantTransactionId =
      "MOSHI" +
      Date.now().toString(36).toUpperCase() +
      crypto
        .randomUUID()
        .replace(/-/g, "")
        .slice(0, 8)
        .toUpperCase();

    const publicUrl = getMoshiPublicUrl();

    const shippingAddress = {
      full_name: fullName,
      phone,
      country,
      city,
      address,
      instructions,
    };

    const { data: batch, error: batchError } =
      await adminClient.rpc("create_checkout_batch", {
        p_buyer_id: user.id,
        p_merchant_transaction_id: merchantTransactionId,
        p_shipping_address: shippingAddress,
        p_expected_amount_xof: amountXof,
        p_display_currency: displayCurrency,
        p_display_total: displayTotal,
        p_rate_date: rateDate,
        p_rate_source: rateSource,
        p_provider_version: "v1",
      });

    if (batchError || !batch) {
      console.error("Create checkout batch:", batchError);

      return jsonError(
        batchError?.message ||
          "Impossible de préparer la commande.",
        500
      );
    }

    paymentId = String(batch.payment_id || "");

    if (!paymentId) {
      throw new Error(
        "La base n'a pas retourné l'identifiant du paiement."
      );
    }

    const client = createCinetPayClient();
    const customerName = splitCustomerName(fullName);

    const notifyUrl = `${publicUrl}/api/cinetpay/notify`;

    const successUrl =
      `${publicUrl}/api/cinetpay/return` +
      `?reference=${encodeURIComponent(merchantTransactionId)}` +
      "&outcome=success";

    const failedUrl =
      `${publicUrl}/api/cinetpay/return` +
      `?reference=${encodeURIComponent(merchantTransactionId)}` +
      "&outcome=failed";

    const payment = await client.payment.initialize(
      {
        currency: "XOF",
        merchantTransactionId,
        amount: Number(batch.amount_xof),
        lang: language,
        designation: `Commande Moshi - ${Number(
          batch.order_count || 1
        )} boutique(s)`,
        clientEmail: user.email,
        clientFirstName: customerName.firstName,
        clientLastName: customerName.lastName,
        clientPhoneNumber: normalizeTogoPhone(
          phone || profile?.phone
        ),
        successUrl,
        failedUrl,
        notifyUrl,
        channel: "PUSH",
      },
      "TG"
    );

    if (!payment.notifyToken || !payment.transactionId) {
      throw new Error(
        "CinetPay n'a pas retourné les informations de vérification nécessaires."
      );
    }

    if (
      !payment.details.mustBeRedirected &&
      payment.details.status === "SUCCESS"
    ) {
      const { error: confirmationError } =
        await adminClient.rpc("confirm_checkout_payment", {
          p_merchant_transaction_id: merchantTransactionId,
          p_provider_transaction_id: payment.transactionId,
          p_payment_method: "CinetPay",
        });

      if (confirmationError) {
        throw confirmationError;
      }

      return NextResponse.json({
        success: true,
        payment_url:
          `${publicUrl}/checkout/result?reference=` +
          encodeURIComponent(merchantTransactionId),
        reference: merchantTransactionId,
      });
    }

    if (!payment.paymentUrl) {
      throw new Error(
        "CinetPay n'a pas retourné de lien de paiement."
      );
    }

    const notifyTokenHash = await hashNotifyToken(
      payment.notifyToken
    );

    const { error: updateError } = await adminClient
      .from("checkout_payments")
      .update({
        provider_transaction_id: payment.transactionId,
        notify_token_hash: notifyTokenHash,
        payment_url: payment.paymentUrl,
        metadata: {
          provider_status: payment.status,
          provider_code: payment.code,
          order_count: Number(batch.order_count || 0),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId);

    if (updateError) {
      console.error(
        "Save CinetPay initialization:",
        updateError
      );

      throw updateError;
    }

    return NextResponse.json({
      success: true,
      payment_url: payment.paymentUrl,
      reference: merchantTransactionId,
      amount_xof: Number(batch.amount_xof),
      display_currency: displayCurrency,
      display_total: displayTotal,
      rate_date: rateDate,
    });
  } catch (error) {
    console.error("Moshi checkout error:", error);

    if (merchantTransactionId) {
      try {
        const adminClient = createAdminClient();

        await adminClient.rpc("fail_checkout_payment", {
          p_merchant_transaction_id: merchantTransactionId,
          p_status: "refused",
        });
      } catch (cleanupError) {
        console.error(
          "Checkout cleanup error:",
          cleanupError
        );
      }
    }

    const message =
      error instanceof Error
        ? error.message
        : "Une erreur est survenue pendant le paiement.";

    const status =
      message.toLowerCase().includes("cinetpay") ||
      message.toLowerCase().includes("identifiants")
        ? 503
        : 500;

    return jsonError(message, status);
  }
}
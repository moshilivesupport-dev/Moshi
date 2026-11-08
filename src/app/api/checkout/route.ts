import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildCheckoutBreakdown } from "@/lib/payment/cinetpay";
import { initPayment, CINETPAY_CURRENCIES } from "@/lib/payment/cinetpay-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10).default(1),
  streamId: z.string().uuid().optional(),
  shippingAddress: z
    .object({
      name: z.string().max(100),
      phone: z.string().max(30),
      city: z.string().max(80),
      address: z.string().max(200),
    })
    .optional(),
});

async function loadSettings(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin
    .from("platform_settings")
    .select("key, value")
    .in("key", ["commission_rate", "cinetpay_fee_percent", "cinetpay_fee_fixed"]);

  const map = new Map<string, number>();
  for (const row of data ?? []) map.set(row.key, Number(row.value));
  const num = (key: string, fallback: number) => {
    const v = map.get(key);
    return v !== undefined && Number.isFinite(v) ? v : fallback;
  };
  return {
    fee: { percent: num("cinetpay_fee_percent", 2.5), fixed: num("cinetpay_fee_fixed", 0) },
    commission: num("commission_rate", 10),
  };
}

export async function POST(req: Request) {
  // 1. Utilisateur connecté
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  // 2. Validation de l'entrée (le client n'envoie JAMAIS de prix)
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const { productId, quantity, streamId, shippingAddress } = parsed.data;

  const admin = createAdminClient();

  // 3. Le prix vient de la base, pas du navigateur
  const { data: product } = await admin
    .from("products")
    .select("id, seller_id, title, price, currency, stock, is_active")
    .eq("id", productId)
    .maybeSingle();

  if (!product || !product.is_active) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }
  if (product.seller_id === user.id) {
    return NextResponse.json({ error: "Vous ne pouvez pas acheter votre propre produit" }, { status: 400 });
  }
  if ((product.stock ?? 0) < quantity) {
    return NextResponse.json({ error: "Stock insuffisant" }, { status: 409 });
  }
  if (!(CINETPAY_CURRENCIES as readonly string[]).includes(product.currency)) {
    return NextResponse.json(
      { error: `La devise ${product.currency} n'est pas disponible pour le paiement` },
      { status: 400 }
    );
  }

  const unitPrice = Number(product.price);
  if (!Number.isInteger(unitPrice) || unitPrice <= 0) {
    return NextResponse.json({ error: "Prix du produit invalide pour le paiement" }, { status: 400 });
  }

  // Le live d'origine doit exister, sinon on l'ignore
  let validStreamId: string | null = null;
  if (streamId) {
    const { data: stream } = await admin.from("live_streams").select("id").eq("id", streamId).maybeSingle();
    validStreamId = stream?.id ?? null;
  }

  // 4. Calcul du total (frais CinetPay à la charge du client)
  const settings = await loadSettings(admin);
  const breakdown = buildCheckoutBreakdown(
    unitPrice * quantity,
    product.currency,
    settings.fee,
    settings.commission
  );

  // 5. Enregistrer commande + transaction AVANT d'ouvrir le guichet (recommandation CinetPay)
  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      buyer_id: user.id,
      seller_id: product.seller_id,
      stream_id: validStreamId,
      product_id: product.id,
      quantity,
      unit_price: unitPrice,
      total_amount: breakdown.customerTotal, // montant réellement payé par l'acheteur
      currency: product.currency,
      status: "pending",
      escrow_status: "held",
      shipping_address: shippingAddress ?? null,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    console.error("[checkout] création commande :", orderError?.message);
    return NextResponse.json({ error: "Impossible de créer la commande" }, { status: 500 });
  }

  const transactionId = `MSH${randomUUID().replace(/-/g, "")}`;

  const { error: txError } = await admin.from("cinetpay_transactions").insert({
    transaction_id: transactionId,
    user_id: user.id,
    order_id: order.id,
    amount: breakdown.customerTotal,
    fees: breakdown.cinetpayFees,
    currency: product.currency,
    status: "pending",
  });

  const cancelAll = async () => {
    const now = new Date().toISOString();
    await admin.from("orders").update({ status: "cancelled", updated_at: now }).eq("id", order.id);
    await admin
      .from("cinetpay_transactions")
      .update({ status: "cancelled", updated_at: now })
      .eq("transaction_id", transactionId);
  };

  if (txError) {
    console.error("[checkout] création transaction :", txError.message);
    await cancelAll();
    return NextResponse.json({ error: "Impossible d'initialiser le paiement" }, { status: 500 });
  }

  // 6. Ouvrir le guichet CinetPay
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin).replace(/\/$/, "");
  try {
    const { paymentUrl } = await initPayment({
      transactionId,
      amount: breakdown.customerTotal,
      currency: product.currency,
      description: `Moshi - ${product.title}`,
      notifyUrl: `${appUrl}/api/cinetpay/notify`,
      returnUrl: `${appUrl}/api/cinetpay/return?tx=${transactionId}`,
      metadata: order.id,
    });
    return NextResponse.json({ paymentUrl, orderId: order.id });
  } catch (e) {
    console.error("[checkout] CinetPay :", e instanceof Error ? e.message : e);
    await cancelAll();
    return NextResponse.json(
      { error: "Le service de paiement est indisponible. Réessayez dans un instant." },
      { status: 502 }
    );
  }
}

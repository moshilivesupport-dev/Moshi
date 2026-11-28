import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userClient = await createClient();

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentification requise." },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const reference =
      url.searchParams.get("reference")?.trim();

    if (!reference) {
      return NextResponse.json(
        { error: "Référence manquante." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data: payment, error } = await adminClient
      .from("checkout_payments")
      .select(
        "merchant_transaction_id,status,amount_xof,currency,display_currency,display_total,created_at"
      )
      .eq("merchant_transaction_id", reference)
      .eq("buyer_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Checkout status:", error);

      return NextResponse.json(
        { error: "Impossible de lire le statut du paiement." },
        { status: 500 }
      );
    }

    if (!payment) {
      return NextResponse.json(
        { error: "Paiement introuvable." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        payment,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error("Checkout status error:", error);

    return NextResponse.json(
      { error: "Erreur interne." },
      { status: 500 }
    );
  }
}
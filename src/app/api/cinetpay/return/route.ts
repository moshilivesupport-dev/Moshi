import { NextRequest, NextResponse } from "next/server";
import { syncCinetPayTransaction } from "@/lib/payment/sync";
import { TX_ID_RE } from "@/lib/payment/cinetpay-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Page de retour après paiement. CinetPay peut rediriger en GET ou en POST.
 * On revérifie la transaction ici aussi : ça marche même si le webhook
 * n'est pas joignable (ex. développement en localhost).
 */
async function handle(req: NextRequest) {
  const url = new URL(req.url);
  const base = (process.env.NEXT_PUBLIC_APP_URL || url.origin).replace(/\/$/, "");
  const tx = url.searchParams.get("tx") ?? "";

  let outcome: "success" | "failed" | "pending" = "pending";
  if (TX_ID_RE.test(tx)) {
    try {
      const result = await syncCinetPayTransaction(tx);
      if (result === "accepted") outcome = "success";
      else if (result === "refused") outcome = "failed";
    } catch (e) {
      console.error("[cinetpay/return]", e instanceof Error ? e.message : e);
    }
  }

  return NextResponse.redirect(`${base}/orders?payment=${outcome}`, 303);
}

export const GET = handle;
export const POST = handle;

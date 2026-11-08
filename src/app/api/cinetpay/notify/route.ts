import { NextRequest, NextResponse } from "next/server";
import { syncCinetPayTransaction } from "@/lib/payment/sync";
import { TX_ID_RE } from "@/lib/payment/cinetpay-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** CinetPay "ping" l'URL en GET pour vérifier qu'elle répond 200. */
export async function GET() {
  return new NextResponse("OK", { status: 200 });
}

/**
 * Notification de paiement (POST, application/x-www-form-urlencoded).
 * On ne retient QUE cpm_trans_id : le statut et le montant sont ensuite
 * vérifiés auprès de l'API CinetPay, jamais lus dans le corps de la requête.
 * Peut être appelée plusieurs fois pour la même transaction.
 */
export async function POST(req: NextRequest) {
  let transactionId = "";
  try {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      transactionId = String(body?.cpm_trans_id ?? body?.transaction_id ?? "");
    } else {
      const form = await req.formData();
      transactionId = String(form.get("cpm_trans_id") ?? "");
    }
  } catch {
    // corps illisible : rien à traiter
  }

  if (!TX_ID_RE.test(transactionId)) {
    return new NextResponse("OK", { status: 200 });
  }

  try {
    await syncCinetPayTransaction(transactionId);
  } catch (e) {
    console.error("[cinetpay/notify]", e instanceof Error ? e.message : e);
    // 500 => CinetPay renverra la notification plus tard
    return new NextResponse("ERROR", { status: 500 });
  }
  return new NextResponse("OK", { status: 200 });
}

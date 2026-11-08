import { createAdminClient } from "@/lib/supabase/admin";
import { checkPayment } from "./cinetpay-server";

export type SyncResult = "accepted" | "refused" | "pending" | "mismatch" | "not_found";

/**
 * Interroge CinetPay sur une transaction et met la base à jour.
 * Idempotent : peut être appelée plusieurs fois (CinetPay renotifie).
 */
export async function syncCinetPayTransaction(transactionId: string): Promise<SyncResult> {
  const admin = createAdminClient();

  const { data: tx, error } = await admin
    .from("cinetpay_transactions")
    .select("id, status, order_id")
    .eq("transaction_id", transactionId)
    .maybeSingle();
  if (error) throw error;
  if (!tx) return "not_found";
  if (tx.status === "accepted") return "accepted";
  if (tx.status === "refused" || tx.status === "cancelled") return "refused";

  const check = await checkPayment(transactionId);

  if (check.status === "ACCEPTED") {
    if (check.amount === null || check.currency === null) {
      console.error("[cinetpay] ACCEPTED sans montant/devise", transactionId);
      return "mismatch";
    }
    const { data, error: rpcError } = await admin.rpc("confirm_order_payment", {
      p_transaction_id: transactionId,
      p_amount: check.amount,
      p_currency: check.currency,
      p_payment_method: check.paymentMethod,
      p_raw: check.raw,
    });
    if (rpcError) throw rpcError;
    if (data === "mismatch") {
      console.error("[cinetpay] montant ou devise différent de la base", transactionId);
      return "mismatch";
    }
    return data === "not_found" ? "not_found" : "accepted";
  }

  if (check.status === "REFUSED") {
    const now = new Date().toISOString();
    await admin
      .from("cinetpay_transactions")
      .update({ status: "refused", raw_response: check.raw, updated_at: now })
      .eq("id", tx.id)
      .eq("status", "pending");
    if (tx.order_id) {
      await admin
        .from("orders")
        .update({ status: "cancelled", updated_at: now })
        .eq("id", tx.order_id)
        .eq("status", "pending");
    }
    return "refused";
  }

  // WAITING_FOR_CUSTOMER ou UNKNOWN : on ne touche à rien, une autre notification suivra.
  return "pending";
}

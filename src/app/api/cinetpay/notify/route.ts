import { NextResponse } from "next/server";
import { parseNotification } from "cinetpay-js";

import { createAdminClient } from "@/lib/supabase/admin";

import {
  createCinetPayClient,
  hashNotifyToken,
  safeEqual,
} from "@/lib/payments/cinetpay";

export const dynamic = "force-dynamic";

function response(message: string, status = 200) {
  return NextResponse.json(
    { success: status < 400, message },
    { status }
  );
}

async function readNotificationBody(
  request: Request
): Promise<unknown> {
  const raw = await request.text();

  if (!raw) {
    throw new Error("Notification vide.");
  }

  try {
    return JSON.parse(raw);
  } catch {
    const params = new URLSearchParams(raw);

    return Object.fromEntries(params.entries());
  }
}

export async function POST(request: Request) {
  try {
    const body = await readNotificationBody(request);
    const notification = parseNotification(body);

    const merchantTransactionId =
      notification.merchantTransactionId;

    const transactionId = notification.transactionId;
    const notifyToken = notification.notifyToken;

    if (
      !merchantTransactionId ||
      !transactionId ||
      !notifyToken
    ) {
      return response("Notification incomplète.", 400);
    }

    const adminClient = createAdminClient();

    const { data: payment, error: paymentError } =
      await adminClient
        .from("checkout_payments")
        .select(
          "id,buyer_id,merchant_transaction_id,provider_version,provider_transaction_id,notify_token_hash,status"
        )
        .eq(
          "merchant_transaction_id",
          merchantTransactionId
        )
        .maybeSingle();

    if (paymentError) {
      console.error(
        "CinetPay notification database:",
        paymentError
      );

      return response("Erreur de vérification.", 500);
    }

    if (!payment) {
      return response("Transaction inconnue.", 404);
    }

    if (payment.status === "accepted") {
      return response("Paiement déjà confirmé.");
    }

    if (payment.provider_version !== "v1") {
      return response("Version de paiement incorrecte.", 400);
    }

    if (
      !payment.notify_token_hash ||
      !payment.provider_transaction_id
    ) {
      return response(
        "Transaction non initialisée correctement.",
        409
      );
    }

    if (
      payment.provider_transaction_id !== transactionId
    ) {
      return response(
        "Identifiant de transaction incorrect.",
        401
      );
    }

    const receivedHash = await hashNotifyToken(notifyToken);

    if (
      !safeEqual(
        payment.notify_token_hash,
        receivedHash
      )
    ) {
      return response("Jeton de notification invalide.", 401);
    }

    const client = createCinetPayClient();

    const providerStatus = await client.payment.getStatus(
      transactionId,
      "TG"
    );

    if (
      providerStatus.merchantTransactionId !==
        merchantTransactionId ||
      providerStatus.transactionId !== transactionId
    ) {
      return response(
        "Les informations du fournisseur ne correspondent pas.",
        401
      );
    }

    if (providerStatus.status === "SUCCESS") {
      const { data: confirmation, error: confirmError } =
        await adminClient.rpc(
          "confirm_checkout_payment",
          {
            p_merchant_transaction_id:
              merchantTransactionId,
            p_provider_transaction_id: transactionId,
            p_payment_method: "CinetPay",
          }
        );

      if (confirmError) {
        console.error(
          "CinetPay payment confirmation:",
          confirmError
        );

        return response(
          "Impossible de confirmer la commande.",
          500
        );
      }

      return response(
        String(confirmation || "accepted")
      );
    }

    if (
      providerStatus.status === "FAILED" ||
      providerStatus.status === "TRANSACTION_EXIST" ||
      providerStatus.status === "INSUFFICIENT_BALANCE"
    ) {
      const { error: failError } = await adminClient.rpc(
        "fail_checkout_payment",
        {
          p_merchant_transaction_id:
            merchantTransactionId,
          p_status: "refused",
        }
      );

      if (failError) {
        console.error(
          "CinetPay payment failure:",
          failError
        );

        return response(
          "Impossible d'enregistrer le statut du paiement.",
          500
        );
      }

      return response("Paiement refusé.");
    }

    return response("Paiement toujours en attente.");
  } catch (error) {
    console.error("CinetPay notify error:", error);

    return response(
      "Erreur pendant le traitement de la notification.",
      500
    );
  }
}
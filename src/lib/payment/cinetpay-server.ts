/**
 * Appels à l'API CinetPay. SERVEUR UNIQUEMENT (utilise les clés secrètes).
 * Doc : https://docs.cinetpay.com/api/1.0-fr/checkout/initialisation
 */

const API_BASE = "https://api-checkout.cinetpay.com/v2";

/** Devises sans décimales acceptées par ce code (USD exclu volontairement). */
export const CINETPAY_CURRENCIES = ["XOF", "XAF", "CDF", "GNF"] as const;

/** Format de nos identifiants de transaction : "MSH" + 32 caractères hexadécimaux. */
export const TX_ID_RE = /^[A-Za-z0-9]{10,64}$/;

function credentials() {
  const apikey = process.env.CINETPAY_API_KEY;
  const siteId = process.env.CINETPAY_SITE_ID;
  if (!apikey || !siteId) {
    throw new Error("CINETPAY_API_KEY ou CINETPAY_SITE_ID manquant");
  }
  return { apikey, siteId };
}

async function postJson(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const json = await res.json().catch(() => null);
  return { httpStatus: res.status, json };
}

/** CinetPay déconseille les caractères spéciaux dans la description. */
function cleanDescription(text: string) {
  return text.replace(/[#/$_&]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100) || "Commande Moshi";
}

export async function initPayment(params: {
  transactionId: string;
  amount: number;
  currency: string;
  description: string;
  notifyUrl: string;
  returnUrl: string;
  metadata?: string;
}): Promise<{ paymentUrl: string; paymentToken: string }> {
  const { apikey, siteId } = credentials();

  const { json } = await postJson("/payment", {
    apikey,
    site_id: siteId,
    transaction_id: params.transactionId,
    amount: params.amount,
    currency: params.currency,
    description: cleanDescription(params.description),
    notify_url: params.notifyUrl,
    return_url: params.returnUrl,
    channels: "ALL",
    lang: "fr",
    metadata: params.metadata,
  });

  const paymentUrl = json?.data?.payment_url;
  if (json?.code !== "201" || !paymentUrl) {
    throw new Error(
      `CinetPay init refusé : ${json?.code ?? "?"} ${json?.message ?? ""} ${json?.description ?? ""}`.trim()
    );
  }
  return { paymentUrl, paymentToken: json.data.payment_token };
}

export type CinetPayStatus = "ACCEPTED" | "REFUSED" | "WAITING_FOR_CUSTOMER" | "UNKNOWN";

export interface CinetPayCheck {
  status: CinetPayStatus;
  amount: number | null;
  currency: string | null;
  paymentMethod: string | null;
  raw: unknown;
}

/**
 * Vérification officielle d'une transaction auprès de CinetPay.
 * C'est la SEULE source de vérité : le corps de la notification n'est jamais cru.
 */
export async function checkPayment(transactionId: string): Promise<CinetPayCheck> {
  const { apikey, siteId } = credentials();
  const { json } = await postJson("/payment/check", {
    apikey,
    site_id: siteId,
    transaction_id: transactionId,
  });

  const data = json?.data;
  const s = String(data?.status ?? "").toUpperCase();
  let status: CinetPayStatus = "UNKNOWN";
  if (s === "ACCEPTED" && String(json?.code) === "00") status = "ACCEPTED";
  else if (s === "REFUSED") status = "REFUSED";
  else if (s === "WAITING_FOR_CUSTOMER") status = "WAITING_FOR_CUSTOMER";

  const amount = data?.amount !== undefined ? Number(data.amount) : null;
  return {
    status,
    amount: amount !== null && Number.isFinite(amount) ? amount : null,
    currency: data?.currency ? String(data.currency) : null,
    paymentMethod: data?.payment_method ? String(data.payment_method) : null,
    raw: json,
  };
}

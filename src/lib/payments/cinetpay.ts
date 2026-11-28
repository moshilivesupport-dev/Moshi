import "server-only";

import { CinetPayClient } from "cinetpay-js";

export const CINETPAY_COUNTRY = "TG" as const;

export function createCinetPayClient() {
  const apiKey = process.env.CINETPAY_API_KEY_TG?.trim();
  const apiPassword =
    process.env.CINETPAY_API_PASSWORD_TG?.trim();

  if (!apiKey || !apiPassword) {
    throw new Error(
      "CinetPay n'est pas configuré. Les identifiants API du Togo sont manquants."
    );
  }

  if (
    !apiKey.startsWith("sk_test_") &&
    !apiKey.startsWith("sk_live_")
  ) {
    throw new Error(
      "La clé CinetPay doit commencer par sk_test_ ou sk_live_."
    );
  }

  return new CinetPayClient({
    credentials: {
      TG: {
        apiKey,
        apiPassword,
      },
    },
    tokenTtl: 82800,
    timeout: 30000,
  });
}

export async function hashNotifyToken(
  token: string
): Promise<string> {
  const bytes = new TextEncoder().encode(token);

  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function safeEqual(
  left: string,
  right: string
): boolean {
  if (left.length !== right.length) return false;

  let difference = 0;

  for (let i = 0; i < left.length; i++) {
    difference |=
      left.charCodeAt(i) ^ right.charCodeAt(i);
  }

  return difference === 0;
}

export function getMoshiPublicUrl(): string {
  const value = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!value) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL est absent de la configuration Cloudflare."
    );
  }

  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new Error(
      "L'URL publique de Moshi doit utiliser HTTPS."
    );
  }

  return url.origin;
}

export function normalizeTogoPhone(
  value: string | null | undefined
): string | undefined {
  if (!value) return undefined;

  const digits = value.replace(/\D/g, "");

  if (!digits) return undefined;

  if (digits.startsWith("228")) {
    return `+${digits}`;
  }

  /*
   * Les numéros togolais locaux sont complétés avec +228.
   * Les autres formats sont refusés plutôt que transformés
   * silencieusement en numéro incorrect.
   */
  if (digits.length === 8) {
    return `+228${digits}`;
  }

  return undefined;
}
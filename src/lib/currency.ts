export const MOSHI_CURRENCIES = [
  "XOF",
  "EUR",
  "USD",
  "GBP",
  "GHS",
] as const;

export type MoshiCurrency = (typeof MOSHI_CURRENCIES)[number];

export const MOSHI_LANGUAGES = [
  "fr",
  "en",
  "pt",
  "es",
  "ar",
] as const;

export type MoshiLanguage = (typeof MOSHI_LANGUAGES)[number];

export type CurrencyRates = Record<MoshiCurrency, number>;

export const DEFAULT_CURRENCY_RATES: CurrencyRates = {
  XOF: 1,
  EUR: 0,
  USD: 0,
  GBP: 0,
  GHS: 0,
};

export const CURRENCY_OPTIONS = [
  { value: "XOF", label: "XOF — Franc CFA" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "USD", label: "USD — Dollar américain" },
  { value: "GBP", label: "GBP — Livre sterling" },
  { value: "GHS", label: "GHS — Cedi ghanéen" },
] as const;

export const LANGUAGE_OPTIONS = [
  { value: "fr", label: "Français 🇫🇷" },
  { value: "en", label: "English 🇬🇧" },
  { value: "pt", label: "Português 🇵🇹" },
  { value: "es", label: "Español 🇪🇸" },
  { value: "ar", label: "العربية 🇸🇦" },
] as const;

const LOCALES: Record<MoshiLanguage, string> = {
  fr: "fr-FR",
  en: "en-GB",
  pt: "pt-PT",
  es: "es-ES",
  ar: "ar",
};

export function isMoshiCurrency(
  value: unknown
): value is MoshiCurrency {
  return (
    typeof value === "string" &&
    MOSHI_CURRENCIES.includes(value as MoshiCurrency)
  );
}

export function isMoshiLanguage(
  value: unknown
): value is MoshiLanguage {
  return (
    typeof value === "string" &&
    MOSHI_LANGUAGES.includes(value as MoshiLanguage)
  );
}

export function getLocale(language: MoshiLanguage): string {
  return LOCALES[language] || "fr-FR";
}

export function convertXof(
  amountXof: number,
  currency: MoshiCurrency,
  rates: CurrencyRates
): number | null {
  if (!Number.isFinite(amountXof)) return null;

  if (currency === "XOF") {
    return amountXof;
  }

  const rate = rates[currency];

  if (!Number.isFinite(rate) || rate <= 0) {
    return null;
  }

  return amountXof * rate;
}

export function formatXof(
  amount: number,
  language: MoshiLanguage = "fr"
): string {
  const formatter = new Intl.NumberFormat(
    getLocale(language),
    {
      style: "currency",
      currency: "XOF",
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }
  );

  return formatter.format(Number.isFinite(amount) ? amount : 0);
}

/**
 * Les prix enregistrés dans Moshi restent en XOF.
 * La conversion est uniquement destinée à l'affichage.
 * Le montant réellement envoyé à CinetPay reste en XOF.
 */
export function formatDisplayMoney(
  amountXof: number,
  currency: MoshiCurrency,
  language: MoshiLanguage,
  rates: CurrencyRates,
  options?: {
    approximate?: boolean;
    fallbackToXof?: boolean;
  }
): string {
  const amount = convertXof(amountXof, currency, rates);

  if (amount === null) {
    if (options?.fallbackToXof === false) {
      return "—";
    }

    return formatXof(amountXof, language);
  }

  const formatted = new Intl.NumberFormat(
    getLocale(language),
    {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "XOF" ? 0 : 2,
      maximumFractionDigits: currency === "XOF" ? 0 : 2,
    }
  ).format(amount);

  if (currency !== "XOF" && options?.approximate !== false) {
    return `≈ ${formatted}`;
  }

  return formatted;
}
export const CURRENCIES = [
  { code: "XOF", symbol: "CFA", name: "Franc CFA", locale: "fr-FR" },
  { code: "EUR", symbol: "€", name: "Euro", locale: "fr-FR" },
  { code: "USD", symbol: "$", name: "US Dollar", locale: "en-US" },
  { code: "GBP", symbol: "£", name: "British Pound", locale: "en-GB" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar", locale: "en-CA" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira", locale: "en-NG" },
  { code: "GHS", symbol: "GH₵", name: "Ghanaian Cedi", locale: "en-GH" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling", locale: "en-KE" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", locale: "zh-CN" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", locale: "ar-AE" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

// Approximate rates vs XOF (for demo – use real API in production)
const RATES_TO_XOF: Record<CurrencyCode, number> = {
  XOF: 1,
  EUR: 655.957,
  USD: 600,
  GBP: 760,
  CAD: 440,
  NGN: 0.38,
  GHS: 40,
  KES: 4.6,
  CNY: 83,
  AED: 163,
};

export function formatCurrency(amount: number, currency: CurrencyCode = "XOF"): string {
  const curr = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];
  try {
    return new Intl.NumberFormat(curr.locale, {
      style: "currency",
      currency: curr.code,
      maximumFractionDigits: currency === "XOF" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${curr.symbol}${amount.toLocaleString()}`;
  }
}

export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode
): number {
  const inXof = amount * RATES_TO_XOF[from];
  return inXof / RATES_TO_XOF[to];
}

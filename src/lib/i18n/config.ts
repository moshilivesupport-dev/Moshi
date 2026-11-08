export const locales = ["fr", "en", "es", "ar", "pt", "zh", "de", "ha", "sw", "hi"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fr";

export const localeNames: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  es: "Español",
  ar: "العربية",
  pt: "Português",
  zh: "中文",
  de: "Deutsch",
  ha: "Hausa",
  sw: "Kiswahili",
  hi: "हिन्दी",
};

export const rtlLocales: Locale[] = ["ar"];

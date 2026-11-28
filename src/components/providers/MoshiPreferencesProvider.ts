"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_CURRENCY_RATES,
  formatDisplayMoney,
  formatXof,
  isMoshiCurrency,
  isMoshiLanguage,
  type CurrencyRates,
  type MoshiCurrency,
  type MoshiLanguage,
} from "@/lib/currency";
import { translate } from "@/lib/i18n/dictionaries";

const STORAGE_KEY = "moshi-preferences-v1";

type PreferencesUpdate = {
  language?: MoshiLanguage;
  currency?: MoshiCurrency;
};

type RatesResponse = {
  success?: boolean;
  rates?: Partial<CurrencyRates>;
  rateDate?: string;
  source?: string;
  sourceUrl?: string;
  disclaimer?: string;
};

type PreferencesContextValue = {
  language: MoshiLanguage;
  currency: MoshiCurrency;
  rates: CurrencyRates;
  rateDate: string | null;
  ratesSource: string;
  ratesSourceUrl: string;
  ratesDisclaimer: string;
  ready: boolean;
  ratesReady: boolean;
  ratesError: string | null;
  setPreferences: (next: PreferencesUpdate) => void;
  refreshPreferences: () => Promise<void>;
  t: (phrase: string) => string;
  formatMoney: (
    amountXof: number,
    options?: { approximate?: boolean }
  ) => string;
  formatXof: (amountXof: number) => string;
  convertXof: (amountXof: number) => number | null;
};

const PreferencesContext =
  createContext<PreferencesContextValue | null>(null);

function readLocalPreferences(): PreferencesUpdate {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as {
      language?: unknown;
      currency?: unknown;
    };

    return {
      language: isMoshiLanguage(parsed.language)
        ? parsed.language
        : undefined,
      currency: isMoshiCurrency(parsed.currency)
        ? parsed.currency
        : undefined,
    };
  } catch {
    return {};
  }
}

function writeLocalPreferences(
  language: MoshiLanguage,
  currency: MoshiCurrency
) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ language, currency })
    );
  } catch {
    // Le stockage local peut être indisponible.
  }
}

export function MoshiPreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();

  const [language, setLanguage] =
    useState<MoshiLanguage>("fr");

  const [currency, setCurrency] =
    useState<MoshiCurrency>("XOF");

  const [rates, setRates] = useState<CurrencyRates>(
    DEFAULT_CURRENCY_RATES
  );

  const [rateDate, setRateDate] = useState<string | null>(null);
  const [ratesSource, setRatesSource] = useState(
    "StatsGH — Bank of Ghana"
  );
  const [ratesSourceUrl, setRatesSourceUrl] = useState(
    "https://www.statsgh.com/data-vault/bog-fx-rates"
  );
  const [ratesDisclaimer, setRatesDisclaimer] = useState(
    "Taux indicatifs. Les paiements CinetPay restent en XOF."
  );

  const [ready, setReady] = useState(false);
  const [ratesReady, setRatesReady] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  const setPreferences = useCallback(
    (next: PreferencesUpdate) => {
      const nextLanguage = next.language ?? language;
      const nextCurrency = next.currency ?? currency;

      setLanguage(nextLanguage);
      setCurrency(nextCurrency);

      writeLocalPreferences(nextLanguage, nextCurrency);
    },
    [language, currency]
  );

  const refreshPreferences = useCallback(async () => {
    const local = readLocalPreferences();

    if (local.language) setLanguage(local.language);
    if (local.currency) setCurrency(local.currency);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setReady(true);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("preferred_language,preferred_currency")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      const savedLanguage = isMoshiLanguage(
        data?.preferred_language
      )
        ? data.preferred_language
        : "fr";

      const savedCurrency = isMoshiCurrency(
        data?.preferred_currency
      )
        ? data.preferred_currency
        : "XOF";

      setLanguage(savedLanguage);
      setCurrency(savedCurrency);

      writeLocalPreferences(savedLanguage, savedCurrency);
    } catch (error) {
      console.error("Moshi preferences:", error);
    } finally {
      setReady(true);
    }
  }, [supabase]);

  useEffect(() => {
    void refreshPreferences();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED"
      ) {
        window.setTimeout(() => {
          void refreshPreferences();
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, refreshPreferences]);

  /*
   * Recharge les préférences quand l'utilisateur change de page.
   * Cela permet notamment de récupérer les choix sauvegardés
   * depuis l'écran Paramètres.
   */
  useEffect(() => {
    if (!ready) return;
    void refreshPreferences();
  }, [pathname, ready, refreshPreferences]);

  useEffect(() => {
    let active = true;

    async function loadRates() {
      try {
        const response = await fetch("/api/currency/rates", {
          method: "GET",
          cache: "no-store",
        });

        const result =
          (await response.json()) as RatesResponse;

        if (!response.ok || !result.success || !result.rates) {
          throw new Error(
            "Les taux de conversion ne sont pas disponibles."
          );
        }

        const nextRates: CurrencyRates = {
          XOF: 1,
          EUR: Number(result.rates.EUR || 0),
          USD: Number(result.rates.USD || 0),
          GBP: Number(result.rates.GBP || 0),
          GHS: Number(result.rates.GHS || 0),
        };

        if (
          !Number.isFinite(nextRates.EUR) ||
          !Number.isFinite(nextRates.USD) ||
          !Number.isFinite(nextRates.GBP) ||
          !Number.isFinite(nextRates.GHS) ||
          nextRates.EUR <= 0 ||
          nextRates.USD <= 0 ||
          nextRates.GBP <= 0 ||
          nextRates.GHS <= 0
        ) {
          throw new Error("Taux de conversion invalides.");
        }

        if (!active) return;

        setRates(nextRates);
        setRateDate(result.rateDate || null);
        setRatesSource(
          result.source || "StatsGH — Bank of Ghana"
        );
        setRatesSourceUrl(
          result.sourceUrl ||
            "https://www.statsgh.com/data-vault/bog-fx-rates"
        );
        setRatesDisclaimer(
          result.disclaimer ||
            "Taux indicatifs. Les paiements CinetPay restent en XOF."
        );
        setRatesError(null);
      } catch (error) {
        if (!active) return;

        setRatesError(
          error instanceof Error
            ? error.message
            : "Conversion indisponible."
        );
      } finally {
        if (active) setRatesReady(true);
      }
    }

    void loadRates();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir =
      language === "ar" ? "rtl" : "ltr";
    document.documentElement.dataset.currency = currency;
  }, [language, currency]);

  const t = useCallback(
    (phrase: string) => translate(language, phrase),
    [language]
  );

  const formatMoney = useCallback(
    (
      amountXof: number,
      options?: { approximate?: boolean }
    ) =>
      formatDisplayMoney(
        amountXof,
        currency,
        language,
        rates,
        {
          approximate: options?.approximate ?? true,
          fallbackToXof: true,
        }
      ),
    [currency, language, rates]
  );

  const formatExactXof = useCallback(
    (amountXof: number) => formatXof(amountXof, language),
    [language]
  );

  const convert = useCallback(
    (amountXof: number) => {
      const rate = rates[currency];

      if (
        !Number.isFinite(amountXof) ||
        !Number.isFinite(rate) ||
        rate <= 0
      ) {
        return currency === "XOF" ? amountXof : null;
      }

      return amountXof * rate;
    },
    [currency, rates]
  );

  const value = useMemo<PreferencesContextValue>(
    () => ({
      language,
      currency,
      rates,
      rateDate,
      ratesSource,
      ratesSourceUrl,
      ratesDisclaimer,
      ready,
      ratesReady,
      ratesError,
      setPreferences,
      refreshPreferences,
      t,
      formatMoney,
      formatXof: formatExactXof,
      convertXof: convert,
    }),
    [
      language,
      currency,
      rates,
      rateDate,
      ratesSource,
      ratesSourceUrl,
      ratesDisclaimer,
      ready,
      ratesReady,
      ratesError,
      setPreferences,
      refreshPreferences,
      t,
      formatMoney,
      formatExactXof,
      convert,
    ]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function useMoshiPreferences() {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error(
      "useMoshiPreferences doit être utilisé dans MoshiPreferencesProvider."
    );
  }

  return context;
}
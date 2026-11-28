import "server-only";

import type { CurrencyRates } from "@/lib/currency";
import { DEFAULT_CURRENCY_RATES } from "@/lib/currency";

type RateRow = {
  rate_date?: string;
  pair?: string;
  currency_pair?: string;
  mid?: number | string | null;
  mid_rate?: number | string | null;
};

type RatesPayload = {
  data?: RateRow[];
  results?: RateRow[];
  rows?: RateRow[];
};

export type XofRatesResult = {
  rates: CurrencyRates;
  rateDate: string;
  source: string;
  sourceUrl: string;
};

const API_URL =
  "https://www.statsgh.com/api/data/bog-fx-rates";

const SOURCE_URL =
  "https://www.statsgh.com/data-vault/bog-fx-rates";

const SOURCE_NAME = "StatsGH — Bank of Ghana";

const CACHE_TTL = 6 * 60 * 60 * 1000;

let cachedRates: {
  value: XofRatesResult;
  expiresAt: number;
} | null = null;

let pendingRequest: Promise<XofRatesResult> | null = null;

function getRows(payload: unknown): RateRow[] {
  if (Array.isArray(payload)) {
    return payload as RateRow[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const data = payload as RatesPayload;

  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.rows)) return data.rows;

  return [];
}

function getLatestRate(
  rows: RateRow[],
  pair: string
): { rate: number; date: string } | null {
  const matching = rows
    .map((row) => ({
      pair: String(row.pair || row.currency_pair || "")
        .toUpperCase()
        .trim(),
      rate: Number(row.mid ?? row.mid_rate),
      date: String(row.rate_date || ""),
    }))
    .filter(
      (row) =>
        row.pair === pair &&
        Number.isFinite(row.rate) &&
        row.rate > 0 &&
        /^\d{4}-\d{2}-\d{2}$/.test(row.date)
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!matching.length) return null;

  return {
    rate: matching[0].rate,
    date: matching[0].date,
  };
}

async function requestRates(): Promise<XofRatesResult> {
  const response = await fetch(API_URL, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "force-cache",
    next: {
      revalidate: 21600,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Source des taux indisponible (${response.status}).`
    );
  }

  const payload: unknown = await response.json();
  const rows = getRows(payload);

  const ghsXof = getLatestRate(rows, "GHSXOF");
  const usdGhs = getLatestRate(rows, "USDGHS");
  const eurGhs = getLatestRate(rows, "EURGHS");
  const gbpGhs = getLatestRate(rows, "GBPGHS");

  if (!ghsXof || !usdGhs || !eurGhs || !gbpGhs) {
    throw new Error(
      "Les taux nécessaires ne sont pas tous disponibles."
    );
  }

  const xofPerGhs = ghsXof.rate;

  const rates: CurrencyRates = {
    XOF: 1,
    GHS: 1 / xofPerGhs,
    USD: 1 / (xofPerGhs * usdGhs.rate),
    EUR: 1 / (xofPerGhs * eurGhs.rate),
    GBP: 1 / (xofPerGhs * gbpGhs.rate),
  };

  const rateDate = [
    ghsXof.date,
    usdGhs.date,
    eurGhs.date,
    gbpGhs.date,
  ].sort()[0];

  return {
    rates,
    rateDate,
    source: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
  };
}

export async function getXofDisplayRates(): Promise<XofRatesResult> {
  const now = Date.now();

  if (cachedRates && cachedRates.expiresAt > now) {
    return cachedRates.value;
  }

  if (pendingRequest) {
    return pendingRequest;
  }

  pendingRequest = requestRates();

  try {
    const result = await pendingRequest;

    cachedRates = {
      value: result,
      expiresAt: Date.now() + CACHE_TTL,
    };

    return result;
  } catch (error) {
    if (cachedRates) {
      return cachedRates.value;
    }

    throw error;
  } finally {
    pendingRequest = null;
  }
}

export function getFallbackXofRates(): XofRatesResult {
  return {
    rates: DEFAULT_CURRENCY_RATES,
    rateDate: "",
    source: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
  };
}
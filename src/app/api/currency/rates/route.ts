import { NextResponse } from "next/server";

export const revalidate = 21600;

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

const API_URL =
  "https://www.statsgh.com/api/data/bog-fx-rates";

const SOURCE_URL =
  "https://www.statsgh.com/data-vault/bog-fx-rates";

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

export async function GET() {
  try {
    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "force-cache",
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

    const rates = {
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

    return NextResponse.json(
      {
        success: true,
        base: "XOF",
        rates,
        rateDate,
        source: "StatsGH — Bank of Ghana",
        sourceUrl: SOURCE_URL,
        licence: "CC BY 4.0",
        disclaimer:
          "Taux indicatifs destinés à l'affichage. Les paiements CinetPay sont toujours encaissés en XOF.",
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=21600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error("Moshi currency rates:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Les taux de conversion sont momentanément indisponibles.",
        rates: {
          XOF: 1,
          EUR: 0,
          USD: 0,
          GBP: 0,
          GHS: 0,
        },
        source: "StatsGH — Bank of Ghana",
        sourceUrl: SOURCE_URL,
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
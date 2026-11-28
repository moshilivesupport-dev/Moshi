import { NextResponse } from "next/server";

import {
  getXofDisplayRates,
  getFallbackXofRates,
} from "@/lib/currency-rates";

export const revalidate = 21600;

export async function GET() {
  try {
    const result = await getXofDisplayRates();

    return NextResponse.json(
      {
        success: true,
        base: "XOF",
        rates: result.rates,
        rateDate: result.rateDate,
        source: result.source,
        sourceUrl: result.sourceUrl,
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

    const fallback = getFallbackXofRates();

    return NextResponse.json(
      {
        success: false,
        error:
          "Les taux de conversion sont momentanément indisponibles.",
        base: "XOF",
        rates: fallback.rates,
        rateDate: null,
        source: fallback.source,
        sourceUrl: fallback.sourceUrl,
        disclaimer:
          "Seule la devise XOF est affichée tant que les taux ne sont pas disponibles.",
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
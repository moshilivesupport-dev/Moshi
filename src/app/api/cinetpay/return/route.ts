import { NextResponse } from "next/server";
import { getMoshiPublicUrl } from "@/lib/payments/cinetpay";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const incomingUrl = new URL(request.url);

  const reference =
    incomingUrl.searchParams.get("reference") || "";

  const requestedOutcome =
    incomingUrl.searchParams.get("outcome") || "";

  const outcome =
    requestedOutcome === "success" ||
    requestedOutcome === "failed"
      ? requestedOutcome
      : "unknown";

  let baseUrl: string;

  try {
    baseUrl = getMoshiPublicUrl();
  } catch {
    baseUrl = incomingUrl.origin;
  }

  const destination = new URL(
    "/checkout/result",
    baseUrl
  );

  if (reference) {
    destination.searchParams.set("reference", reference);
  }

  destination.searchParams.set("outcome", outcome);

  return NextResponse.redirect(destination, 303);
}
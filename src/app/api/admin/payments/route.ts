
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const MAX_ROWS_PER_PROVIDER = 1000;

type PaymentStatus = "pending" | "success" | "failed" | "refunded";

function normalizeCinetPayStatus(status: string | null): PaymentStatus {
  if (status === "accepted") return "success";
  if (status === "refused" || status === "cancelled") return "failed";
  return "pending";
}

function normalizeCryptoStatus(status: string | null): PaymentStatus {
  if (status === "finished") return "success";
  if (status === "refunded") return "refunded";

  if (status === "failed" || status === "expired") {
    return "failed";
  }

  return "pending";
}

function normalizeSearch(value: string | null) {
  return (value || "").trim().toLocaleLowerCase("fr").slice(0, 100);
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const url = new URL(request.url);

    const requestedPage = Number(url.searchParams.get("page"));
    const page =
      Number.isFinite(requestedPage) && requestedPage > 0
        ? Math.floor(requestedPage)
        : 1;

    const providerParam = url.searchParams.get("provider");
    const provider =
      providerParam === "cinetpay" || providerParam === "crypto"
        ? providerParam
        : "all";

    const statusParam = url.searchParams.get("status");
    const status =
      statusParam === "pending" ||
      statusParam === "success" ||
      statusParam === "failed" ||
      statusParam === "refunded"
        ? statusParam
        : "all";

    const search = normalizeSearch(url.searchParams.get("q"));

    const shouldLoadCinetPay =
      provider === "all" || provider === "cinetpay";

    const shouldLoadCrypto =
      provider === "all" || provider === "crypto";

    const [cinetPayResult, cryptoResult] = await Promise.all([
      shouldLoadCinetPay
        ? auth.adminClient
            .from("cinetpay_transactions")
            .select(
              `
                id,
                user_id,
                order_id,
                transaction_id,
                provider_transaction_id,
                amount,
                fees,
                currency,
                status,
                payment_method,
                created_at,
                updated_at,
                user:profiles!cinetpay_transactions_user_id_fkey (
                  id,
                  username,
                  full_name,
                  email,
                  phone,
                  country,
                  avatar_url
                )
              `,
              { count: "exact" }
            )
            .order("created_at", { ascending: false })
            .limit(MAX_ROWS_PER_PROVIDER)
        : Promise.resolve({ data: [], error: null, count: 0 }),

      shouldLoadCrypto
        ? auth.adminClient
            .from("crypto_transactions")
            .select(
              `
                id,
                user_id,
                provider,
                provider_payment_id,
                merchant_order_id,
                pay_currency,
                price_amount_xof,
                price_amount_usd,
                coins_to_credit,
                pay_amount,
                actually_paid,
                status,
                provider_status,
                expires_at,
                confirmed_at,
                created_at,
                updated_at,
                user:profiles!crypto_transactions_user_id_fkey (
                  id,
                  username,
                  full_name,
                  email,
                  phone,
                  country,
                  avatar_url
                )
              `,
              { count: "exact" }
            )
            .order("created_at", { ascending: false })
            .limit(MAX_ROWS_PER_PROVIDER)
        : Promise.resolve({ data: [], error: null, count: 0 }),
    ]);

    if (cinetPayResult.error || cryptoResult.error) {
      console.error("Admin payments query error:", {
        cinetpay: cinetPayResult.error,
        crypto: cryptoResult.error,
      });

      return NextResponse.json(
        { error: "Impossible de charger les paiements." },
        { status: 500 }
      );
    }

    const cinetpayPayments = (cinetPayResult.data ?? []).map(
      (item: any) => {
        const user = Array.isArray(item.user)
          ? item.user[0] ?? null
          : item.user ?? null;

        return {
          id: item.id,
          provider: "cinetpay",
          providerLabel: "CinetPay",
          userId: item.user_id,
          user,
          reference: item.transaction_id,
          providerReference: item.provider_transaction_id,
          amount: Number(item.amount || 0),
          currency: item.currency || "XOF",
          fees: item.fees === null ? null : Number(item.fees),
          paymentMethod: item.payment_method,
          status: normalizeCinetPayStatus(item.status),
          providerStatus: item.status,
          coins: null,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          confirmedAt:
            item.status === "accepted" ? item.updated_at : null,
          expiresAt: null,
          orderId: item.order_id,
        };
      }
    );

    const cryptoPayments = (cryptoResult.data ?? []).map(
      (item: any) => {
        const user = Array.isArray(item.user)
          ? item.user[0] ?? null
          : item.user ?? null;

        return {
          id: item.id,
          provider: "crypto",
          providerLabel: "Crypto / NOWPayments",
          userId: item.user_id,
          user,
          reference: item.merchant_order_id,
          providerReference: item.provider_payment_id,
          amount: Number(item.price_amount_xof || 0),
          currency: "XOF",
          fees: null,
          paymentMethod: item.pay_currency,
          status: normalizeCryptoStatus(item.status),
          providerStatus: item.provider_status || item.status,
          coins: Number(item.coins_to_credit || 0),
          cryptoAmount:
            item.pay_amount === null ? null : Number(item.pay_amount),
          cryptoPaid:
            item.actually_paid === null
              ? null
              : Number(item.actually_paid),
          cryptoCurrency: item.pay_currency,
          usdAmount: Number(item.price_amount_usd || 0),
          createdAt: item.created_at,
          updatedAt: item.updated_at,
          confirmedAt: item.confirmed_at,
          expiresAt: item.expires_at,
          orderId: null,
        };
      }
    );

    let payments = [...cinetpayPayments, ...cryptoPayments];

    if (status !== "all") {
      payments = payments.filter((item) => item.status === status);
    }

    if (search) {
      payments = payments.filter((item) => {
        const user = item.user;

        const searchableValues = [
          item.id,
          item.userId,
          item.reference,
          item.providerReference,
          item.providerStatus,
          item.paymentMethod,
          user?.username,
          user?.full_name,
          user?.email,
          user?.phone,
        ];

        return searchableValues.some((value) =>
          String(value || "")
            .toLocaleLowerCase("fr")
            .includes(search)
        );
      });
    }

    payments.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    const total = payments.length;
    const start = (page - 1) * PAGE_SIZE;
    const paginatedPayments = payments.slice(start, start + PAGE_SIZE);

    return NextResponse.json(
      {
        success: true,
        payments: paginatedPayments,
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
        providerLimits: {
          maxRowsPerProvider: MAX_ROWS_PER_PROVIDER,
          truncated:
            (cinetPayResult.count ?? 0) > MAX_ROWS_PER_PROVIDER ||
            (cryptoResult.count ?? 0) > MAX_ROWS_PER_PROVIDER,
        },
        totals: {
          cinetpay: cinetPayResult.count ?? 0,
          crypto: cryptoResult.count ?? 0,
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error("Admin payments error:", error);

    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}

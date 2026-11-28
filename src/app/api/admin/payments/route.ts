import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const MAX_ROWS_PER_PROVIDER = 1000;

type PaymentStatus = "pending" | "success" | "failed" | "refunded";

function normalizeCheckoutStatus(status: string): PaymentStatus {
  if (status === "paid" || status === "paid_unfulfilled") {
    return "success";
  }

  if (status === "failed" || status === "expired") {
    return "failed";
  }

  return "pending";
}

function normalizeCryptoStatus(status: string | null): PaymentStatus {
  if (status === "finished" || status === "confirmed") {
    return "success";
  }

  if (status === "refunded") return "refunded";

  if (status === "failed" || status === "expired") {
    return "failed";
  }

  return "pending";
}

function normalizeSearch(value: string | null): string {
  return (value || "")
    .trim()
    .toLocaleLowerCase("fr")
    .slice(0, 100);
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
    const status: PaymentStatus | "all" =
      statusParam === "pending" ||
      statusParam === "success" ||
      statusParam === "failed" ||
      statusParam === "refunded"
        ? statusParam
        : "all";

    const search = normalizeSearch(url.searchParams.get("q"));

    let checkoutResult: any = {
      data: [],
      error: null,
      count: 0,
    };

    let cryptoResult: any = {
      data: [],
      error: null,
      count: 0,
    };

    if (provider === "all" || provider === "cinetpay") {
      checkoutResult = await auth.adminClient
        .from("checkout_payments")
        .select(
          `
            id,
            buyer_id,
            merchant_transaction_id,
            provider_version,
            provider_transaction_id,
            amount_xof,
            currency,
            display_currency,
            display_total,
            status,
            payment_method,
            payment_url,
            verified_at,
            created_at,
            updated_at
          `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .limit(MAX_ROWS_PER_PROVIDER);
    }

    if (provider === "all" || provider === "crypto") {
      cryptoResult = await auth.adminClient
        .from("crypto_transactions")
        .select(
          `
            id,
            user_id,
            network,
            asset,
            amount,
            tx_hash,
            status,
            merchant_order_id,
            provider_payment_id,
            pay_currency,
            pay_amount,
            payment_address,
            expires_at,
            price_amount_xof,
            coins_to_credit,
            provider_status,
            actually_paid,
            confirmed_at,
            created_at,
            updated_at
          `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .limit(MAX_ROWS_PER_PROVIDER);
    }

    if (checkoutResult.error || cryptoResult.error) {
      console.error("Admin payments query error:", {
        checkout: checkoutResult.error,
        crypto: cryptoResult.error,
      });

      return NextResponse.json(
        { error: "Impossible de charger les paiements." },
        { status: 500 }
      );
    }

    const checkoutPayments = (checkoutResult.data || []).map(
      (item: any) => ({
        id: item.id,
        provider: "cinetpay",
        providerLabel: "CinetPay",
        userId: item.buyer_id,
        user: null,
        reference: item.merchant_transaction_id,
        providerReference: item.provider_transaction_id,
        amount: Number(item.amount_xof || 0),
        currency: item.currency || "XOF",
        displayCurrency: item.display_currency || "XOF",
        displayTotal: Number(item.display_total || 0),
        fees: null,
        paymentMethod: item.payment_method || "CinetPay",
        status: normalizeCheckoutStatus(item.status),
        providerStatus: item.status,
        providerVersion: item.provider_version,
        coins: null,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        confirmedAt: item.verified_at,
        expiresAt: null,
        orderId: null,
        paymentUrl: item.payment_url,
      })
    );

    const cryptoPayments = (cryptoResult.data || []).map(
      (item: any) => ({
        id: item.id,
        provider: "crypto",
        providerLabel: "Crypto",
        userId: item.user_id,
        user: null,
        reference: item.merchant_order_id,
        providerReference: item.provider_payment_id,
        amount: Number(item.price_amount_xof || 0),
        currency: "XOF",
        fees: null,
        paymentMethod:
          item.pay_currency ||
          item.asset ||
          item.network ||
          "Crypto",
        status: normalizeCryptoStatus(
          item.provider_status || item.status
        ),
        providerStatus: item.provider_status || item.status,
        coins: Number(item.coins_to_credit || 0),
        cryptoAmount:
          item.pay_amount === null
            ? null
            : Number(item.pay_amount),
        cryptoPaid:
          item.actually_paid === null
            ? null
            : Number(item.actually_paid),
        cryptoCurrency: item.pay_currency || item.asset,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        confirmedAt: item.confirmed_at,
        expiresAt: item.expires_at,
        orderId: null,
      })
    );

    let payments = [...checkoutPayments, ...cryptoPayments];

    // profiles ne possède pas de colonne email dans le schéma actuel.
    const userIds = [
      ...new Set(
        payments
          .map((payment) => payment.userId)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const usersMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } =
        await auth.adminClient
          .from("profiles")
          .select(
            "id,username,full_name,phone,country,avatar_url"
          )
          .in("id", userIds);

      if (profilesError) {
        console.error(
          "Admin payments profiles query error:",
          profilesError
        );
      }

      for (const profile of profiles || []) {
        usersMap[profile.id] = profile;
      }
    }

    payments = payments.map((payment) => ({
      ...payment,
      user: usersMap[payment.userId] || null,
    }));

    if (status !== "all") {
      payments = payments.filter(
        (payment) => payment.status === status
      );
    }

    if (search) {
      payments = payments.filter((payment) => {
        const user = payment.user;

        const searchableValues = [
          payment.id,
          payment.userId,
          payment.reference,
          payment.providerReference,
          payment.providerStatus,
          payment.paymentMethod,
          user?.username,
          user?.full_name,
          user?.phone,
          user?.country,
        ];

        return searchableValues.some((value) =>
          String(value || "")
            .toLocaleLowerCase("fr")
            .includes(search)
        );
      });
    }

    payments.sort((a, b) => {
      const dateA = a.createdAt
        ? new Date(a.createdAt).getTime()
        : 0;
      const dateB = b.createdAt
        ? new Date(b.createdAt).getTime()
        : 0;

      return dateB - dateA;
    });

    const total = payments.length;
    const start = (page - 1) * PAGE_SIZE;
    const paginatedPayments = payments.slice(
      start,
      start + PAGE_SIZE
    );

    return NextResponse.json(
      {
        success: true,
        payments: paginatedPayments,
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.max(
          1,
          Math.ceil(total / PAGE_SIZE)
        ),
        providerLimits: {
          maxRowsPerProvider: MAX_ROWS_PER_PROVIDER,
          truncated:
            (checkoutResult.count ?? 0) >
              MAX_ROWS_PER_PROVIDER ||
            (cryptoResult.count ?? 0) >
              MAX_ROWS_PER_PROVIDER,
        },
        totals: {
          cinetpay: checkoutResult.count ?? 0,
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
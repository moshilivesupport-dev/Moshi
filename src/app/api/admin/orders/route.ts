
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const STATUSES = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
  "disputed",
  "refunded",
] as const;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    const page = Number.isFinite(requestedPage)
      ? Math.min(100000, Math.max(1, Math.floor(requestedPage)))
      : 1;

    const requestedStatus = url.searchParams.get("status");
    const status = STATUSES.includes(
      requestedStatus as (typeof STATUSES)[number]
    )
      ? requestedStatus
      : null;

    const search = (url.searchParams.get("q") || "")
      .trim()
      .slice(0, 80)
      .replace(/[%(),]/g, " ");

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = auth.adminClient
      .from("orders")
      .select(
        `
          id,
          buyer_id,
          seller_id,
          product_id,
          quantity,
          unit_price,
          total_amount,
          currency,
          status,
          escrow_status,
          shipping_address,
          tracking_code,
          created_at,
          updated_at,
          buyer:profiles!orders_buyer_id_fkey (
            id,
            username,
            full_name,
            email,
            avatar_url,
            phone,
            country
          ),
          seller:profiles!orders_seller_id_fkey (
            id,
            username,
            full_name,
            email,
            avatar_url,
            phone,
            country
          ),
          product:products!orders_product_id_fkey (
            id,
            title,
            image_url,
            price,
            currency
          )
        `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      const matchingIds = new Set<string>();

      if (UUID.test(search)) {
        matchingIds.add(search);
      }

      const { data: profiles, error: profileError } =
        await auth.adminClient
          .from("profiles")
          .select("id")
          .or(
            `username.ilike.%${search}%,email.ilike.%${search}%,full_name.ilike.%${search}%,phone.ilike.%${search}%`
          )
          .limit(100);

      if (profileError) {
        console.error("Admin order profile search:", profileError);

        return NextResponse.json(
          { error: "Impossible de rechercher les utilisateurs." },
          { status: 500 }
        );
      }

      for (const profile of profiles ?? []) {
        matchingIds.add(profile.id);
      }

      const conditions: string[] = [];

      if (UUID.test(search)) {
        conditions.push(`id.eq.${search}`);
      }

      const ids = [...matchingIds];

      if (ids.length) {
        conditions.push(`buyer_id.in.(${ids.join(",")})`);
        conditions.push(`seller_id.in.(${ids.join(",")})`);
      }

      if (!conditions.length) {
        return NextResponse.json({
          success: true,
          orders: [],
          page,
          pageSize: PAGE_SIZE,
          total: 0,
          totalPages: 1,
        });
      }

      query = query.or(conditions.join(","));
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Admin orders GET:", error);

      return NextResponse.json(
        { error: "Impossible de charger les commandes." },
        { status: 500 }
      );
    }

    const orders = (data ?? []).map((order) => ({
      ...order,
      buyer: Array.isArray(order.buyer)
        ? order.buyer[0] ?? null
        : order.buyer ?? null,
      seller: Array.isArray(order.seller)
        ? order.seller[0] ?? null
        : order.seller ?? null,
      product: Array.isArray(order.product)
        ? order.product[0] ?? null
        : order.product ?? null,
    }));

    const total = count ?? 0;

    return NextResponse.json(
      {
        success: true,
        orders,
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error("Admin orders error:", error);

    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}

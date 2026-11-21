
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const ALLOWED_STATUSES = [
  "pending",
  "processing",
  "paid",
  "rejected",
] as const;

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
      ? Math.max(1, Math.floor(requestedPage))
      : 1;

    const requestedStatus = url.searchParams.get("status");
    const status = ALLOWED_STATUSES.includes(
      requestedStatus as (typeof ALLOWED_STATUSES)[number]
    )
      ? requestedStatus
      : null;

    const search = (url.searchParams.get("q") || "")
      .trim()
      .slice(0, 80)
      .replace(/[,%()]/g, " ");

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = auth.adminClient
      .from("withdrawals")
      .select(
        `
          id,
          seller_id,
          amount,
          currency,
          status,
          notes,
          admin_note,
          cinetpay_payout_id,
          created_at,
          processed_at,
          processed_by,
          seller:profiles!withdrawals_seller_id_fkey (
            id,
            username,
            full_name,
            email,
            avatar_url,
            phone,
            country
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
      const { data: matchingProfiles, error: profileError } =
        await auth.adminClient
          .from("profiles")
          .select("id")
          .or(
            `username.ilike.%${search}%,email.ilike.%${search}%,full_name.ilike.%${search}%,phone.ilike.%${search}%`
          )
          .limit(100);

      if (profileError) {
        console.error("Admin withdrawal search:", profileError);

        return NextResponse.json(
          { error: "Impossible d'effectuer cette recherche." },
          { status: 500 }
        );
      }

      const matchingIds = (matchingProfiles ?? []).map(
        (profile) => profile.id
      );

      const searchConditions = [
        `id.eq.${search}`,
        ...(matchingIds.length
          ? [`seller_id.in.(${matchingIds.join(",")})`]
          : []),
      ];

      query = query.or(searchConditions.join(","));
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Admin withdrawals GET:", error);

      return NextResponse.json(
        { error: "Impossible de charger les demandes de retrait." },
        { status: 500 }
      );
    }

    const withdrawals = (data ?? []).map((item) => ({
      ...item,
      seller: Array.isArray(item.seller)
        ? item.seller[0] ?? null
        : item.seller ?? null,
    }));

    const total = count ?? 0;

    return NextResponse.json(
      {
        success: true,
        withdrawals,
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
    console.error("Admin withdrawals error:", error);

    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}

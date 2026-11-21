
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const ALLOWED_STATUSES = [
  "open",
  "in_progress",
  "resolved",
  "closed",
] as const;

const ALLOWED_CATEGORIES = [
  "purchase",
  "transaction",
  "payment",
  "delivery",
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

    const rawPage = Number(url.searchParams.get("page"));
    const page = Number.isFinite(rawPage)
      ? Math.min(100000, Math.max(1, Math.floor(rawPage)))
      : 1;

    const rawStatus = url.searchParams.get("status");
    const status = ALLOWED_STATUSES.includes(
      rawStatus as (typeof ALLOWED_STATUSES)[number]
    )
      ? rawStatus
      : null;

    const rawCategory = url.searchParams.get("category");
    const category = ALLOWED_CATEGORIES.includes(
      rawCategory as (typeof ALLOWED_CATEGORIES)[number]
    )
      ? rawCategory
      : null;

    const search = (url.searchParams.get("q") || "")
      .trim()
      .slice(0, 80)
      .replace(/[%(),]/g, " ")
      .replace(/\s+/g, " ");

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = auth.adminClient
      .from("support_tickets")
      .select(
        `
          id,
          user_id,
          category,
          subject,
          description,
          order_id,
          stream_id,
          status,
          priority,
          admin_response,
          resolved_by,
          resolved_at,
          created_at,
          updated_at,
          user:profiles!support_tickets_user_id_fkey (
            id,
            username,
            full_name,
            email,
            avatar_url,
            phone,
            country
          ),
          order:orders!support_tickets_order_id_fkey (
            id,
            total_amount,
            currency,
            status,
            escrow_status,
            tracking_code,
            created_at
          )
        `,
        { count: "exact" }
      )
      .in("category", [...ALLOWED_CATEGORIES])
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status) {
      query = query.eq("status", status);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (search) {
      if (UUID.test(search)) {
        query = query.or(
          `id.eq.${search},order_id.eq.${search},user_id.eq.${search}`
        );
      } else {
        query = query.or(
          `subject.ilike.%${search}%,description.ilike.%${search}%`
        );
      }
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Admin disputes GET:", error);

      return NextResponse.json(
        { error: "Impossible de charger les réclamations." },
        { status: 500 }
      );
    }

    const tickets = (data ?? []).map((ticket) => ({
      ...ticket,
      user: Array.isArray(ticket.user)
        ? ticket.user[0] ?? null
        : ticket.user ?? null,
      order: Array.isArray(ticket.order)
        ? ticket.order[0] ?? null
        : ticket.order ?? null,
    }));

    const total = count ?? 0;

    return NextResponse.json(
      {
        success: true,
        tickets,
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
    console.error("Admin disputes error:", error);

    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}

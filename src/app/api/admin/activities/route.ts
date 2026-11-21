
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const ALLOWED_ACTIONS = [
  "user_suspended",
  "user_reactivated",
  "verification_approved",
  "verification_rejected",
  "country_change_in_progress",
  "country_change_approved",
  "country_change_rejected",
  "order_cancelled_by_admin",
  "order_refund_initiated",
  "order_dispute_resolved",
  "order_escrow_released",
  "withdrawal_approved",
  "withdrawal_rejected",
  "withdrawal_marked_paid",
  "support_ticket_resolved",
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

    const requestedAction = url.searchParams.get("action");

    const action = ALLOWED_ACTIONS.includes(
      requestedAction as (typeof ALLOWED_ACTIONS)[number]
    )
      ? requestedAction
      : null;

    const search = (url.searchParams.get("q") || "")
      .trim()
      .slice(0, 80)
      .replace(/[^\p{L}\p{N}@.+\-_ \s]/gu, " ");

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = auth.adminClient
      .from("admin_activity_logs")
      .select(
        "id,admin_user_id,target_user_id,action,reason,metadata,created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (action) {
      query = query.eq("action", action);
    }

    if (search) {
      query = query.ilike("reason", `%${search}%`);
    }

    const { data: logs, error, count } = await query;

    if (error) {
      console.error("Admin activities GET:", error);

      return NextResponse.json(
        { error: "Impossible de charger le journal administratif." },
        { status: 500 }
      );
    }

    const userIds = Array.from(
      new Set(
        (logs ?? [])
          .flatMap((log) => [
            log.admin_user_id,
            log.target_user_id,
          ])
          .filter((id): id is string => Boolean(id))
      )
    );

    const { data: profiles, error: profilesError } = userIds.length
      ? await auth.adminClient
          .from("profiles")
          .select("id,username,full_name,avatar_url,role")
          .in("id", userIds)
      : { data: [], error: null };

    if (profilesError) {
      console.error("Admin activities profiles:", profilesError);

      return NextResponse.json(
        { error: "Impossible de charger les profils associés." },
        { status: 500 }
      );
    }

    const profileMap = new Map(
      (profiles ?? []).map((profile) => [
        profile.id,
        profile,
      ])
    );

    const activities = (logs ?? []).map((log) => ({
      ...log,
      admin: log.admin_user_id
        ? profileMap.get(log.admin_user_id) ?? null
        : null,
      target: log.target_user_id
        ? profileMap.get(log.target_user_id) ?? null
        : null,
    }));

    const total = count ?? 0;

    return NextResponse.json(
      {
        activities,
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.max(
          1,
          Math.ceil(total / PAGE_SIZE)
        ),
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error("Admin activities error:", error);

    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}

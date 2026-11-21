
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;
const UUID_PATTERN =
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
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const search = (url.searchParams.get("q") || "")
      .trim()
      .slice(0, 80)
      .replace(/[,%()]/g, " ");

    const requestedRole = url.searchParams.get("role");
    const role =
      requestedRole === "acheteur" || requestedRole === "vendeur"
        ? requestedRole
        : null;

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = auth.adminClient
      .from("profiles")
      .select(
        "id,email,username,full_name,avatar_url,role,country,phone,is_verified,seller_status,created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (role) {
      query = query.eq("role", role);
    }

    if (search) {
      const pattern = `%${search}%`;

      query = query.or(
        `username.ilike.${pattern},email.ilike.${pattern},full_name.ilike.${pattern},phone.ilike.${pattern}`
      );
    }

    const { data: profiles, error, count } = await query;

    if (error) {
      console.error("Admin users GET:", error);

      return NextResponse.json(
        { error: "Impossible de charger les utilisateurs." },
        { status: 500 }
      );
    }

    const ids = (profiles ?? []).map((profile) => profile.id);

    const { data: admins, error: adminsError } = ids.length
      ? await auth.adminClient
          .from("admin_users")
          .select("user_id")
          .in("user_id", ids)
      : { data: [], error: null };

    if (adminsError) {
      console.error("Admin users roles:", adminsError);

      return NextResponse.json(
        { error: "Impossible de vérifier les comptes administrateurs." },
        { status: 500 }
      );
    }

    const adminIds = new Set(
      (admins ?? []).map((item) => item.user_id)
    );

    const users = await Promise.all(
      (profiles ?? []).map(async (profile) => {
        const { data, error: authError } =
          await auth.adminClient.auth.admin.getUserById(profile.id);

        if (authError || !data.user) {
          console.error(
            "Impossible de lire le compte Auth:",
            profile.id,
            authError
          );

          return null;
        }

        const bannedUntil = data.user.banned_until ?? null;
        const isSuspended =
          Boolean(bannedUntil) &&
          new Date(bannedUntil as string).getTime() > Date.now();

        return {
          id: profile.id,
          email: profile.email || data.user.email || null,
          username: profile.username,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          role: profile.role,
          country: profile.country,
          phone: profile.phone,
          is_verified: profile.is_verified,
          seller_status: profile.seller_status,
          created_at: profile.created_at,
          last_sign_in_at: data.user.last_sign_in_at,
          is_suspended: isSuspended,
          banned_until: bannedUntil,
          is_admin: adminIds.has(profile.id),
        };
      })
    );

    return NextResponse.json(
      {
        users: users.filter(Boolean),
        page,
        pageSize: PAGE_SIZE,
        total: count ?? 0,
        totalPages: Math.max(
          1,
          Math.ceil((count ?? 0) / PAGE_SIZE)
        ),
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error("Admin users GET error:", error);

    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();

    const userId =
      typeof body.userId === "string" ? body.userId.trim() : "";

    const action =
      typeof body.action === "string" ? body.action.trim() : "";

    const reason =
      typeof body.reason === "string" ? body.reason.trim() : "";

    if (!UUID_PATTERN.test(userId)) {
      return NextResponse.json(
        { error: "Identifiant utilisateur invalide." },
        { status: 400 }
      );
    }

    if (!["suspend", "reactivate"].includes(action)) {
      return NextResponse.json(
        { error: "Action invalide." },
        { status: 400 }
      );
    }

    if (reason.length < 5 || reason.length > 1000) {
      return NextResponse.json(
        {
          error:
            "Le motif doit contenir entre 5 et 1000 caractères.",
        },
        { status: 400 }
      );
    }

    if (userId === auth.user.id) {
      return NextResponse.json(
        { error: "Tu ne peux pas suspendre ton propre compte." },
        { status: 403 }
      );
    }

    const { data: targetAdmin, error: adminCheckError } =
      await auth.adminClient
        .from("admin_users")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

    if (adminCheckError) {
      console.error("Admin target check:", adminCheckError);

      return NextResponse.json(
        { error: "Impossible de vérifier ce compte." },
        { status: 500 }
      );
    }

    if (targetAdmin) {
      return NextResponse.json(
        {
          error:
            "La suspension d'un autre administrateur est interdite depuis ce module.",
        },
        { status: 403 }
      );
    }

    const { data: target, error: targetError } =
      await auth.adminClient.auth.admin.getUserById(userId);

    if (targetError || !target.user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable." },
        { status: 404 }
      );
    }

    const previousBan = target.user.banned_until ?? null;

    const wasSuspended =
      Boolean(previousBan) &&
      new Date(previousBan as string).getTime() > Date.now();

    if (action === "suspend" && wasSuspended) {
      return NextResponse.json(
        { error: "Ce compte est déjà suspendu." },
        { status: 409 }
      );
    }

    if (action === "reactivate" && !wasSuspended) {
      return NextResponse.json(
        { error: "Ce compte n'est pas suspendu." },
        { status: 409 }
      );
    }

    const banDuration = action === "suspend" ? "876000h" : "none";

    const { data: updated, error: updateError } =
      await auth.adminClient.auth.admin.updateUserById(userId, {
        ban_duration: banDuration,
      });

    if (updateError || !updated.user) {
      console.error("Admin user status update:", updateError);

      return NextResponse.json(
        { error: "Impossible de modifier le statut du compte." },
        { status: 500 }
      );
    }

    const { error: auditError } = await auth.adminClient
      .from("admin_activity_logs")
      .insert({
        admin_user_id: auth.user.id,
        target_user_id: userId,
        action:
          action === "suspend"
            ? "user_suspended"
            : "user_reactivated",
        reason,
        metadata: {
          previous_banned_until: previousBan,
          new_banned_until: updated.user.banned_until ?? null,
        },
      });

    if (auditError) {
      console.error("Admin audit insertion failed:", auditError);

      // Restaurer l'état antérieur si l'historique ne peut pas être écrit.
      const remainingHours =
        previousBan &&
        new Date(previousBan).getTime() > Date.now()
          ? Math.max(
              1,
              Math.ceil(
                (new Date(previousBan).getTime() - Date.now()) /
                  3600000
              )
            )
          : null;

      const rollbackDuration = remainingHours
        ? `${remainingHours}h`
        : "none";

      const { error: rollbackError } =
        await auth.adminClient.auth.admin.updateUserById(userId, {
          ban_duration: rollbackDuration,
        });

      if (rollbackError) {
        console.error("Admin status rollback failed:", rollbackError);
      }

      return NextResponse.json(
        {
          error:
            "L'historique administratif n'a pas pu être enregistré. L'opération a été annulée si possible. Vérification nécessaire.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          action === "suspend"
            ? "Compte suspendu."
            : "Compte réactivé.",
        user: {
          id: userId,
          banned_until: updated.user.banned_until ?? null,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Admin users POST error:", error);

    return NextResponse.json(
      { error: "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}

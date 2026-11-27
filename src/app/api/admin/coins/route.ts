import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type PackInput = {
  name?: unknown;
  coins?: unknown;
  bonus?: unknown;
  price_fcfa?: unknown;
  is_popular?: unknown;
  is_active?: unknown;
  sort_order?: unknown;
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function validatePack(body: PackInput, partial = false) {
  const values: Record<string, unknown> = {};

  if (!partial || body.name !== undefined) {
    if (
      typeof body.name !== "string" ||
      body.name.trim().length < 2 ||
      body.name.trim().length > 80
    ) {
      return { error: "Le nom doit contenir entre 2 et 80 caractères." };
    }

    values.name = body.name.trim();
  }

  if (!partial || body.coins !== undefined) {
    const coins = Number(body.coins);

    if (!Number.isSafeInteger(coins) || coins <= 0) {
      return { error: "Le nombre de coins doit être un entier positif." };
    }

    values.coins = coins;
  }

  if (!partial || body.bonus !== undefined) {
    const bonus = body.bonus === undefined ? 0 : Number(body.bonus);

    if (!Number.isSafeInteger(bonus) || bonus < 0) {
      return { error: "Le bonus doit être un entier positif ou nul." };
    }

    values.bonus = bonus;
  }

  if (!partial || body.price_fcfa !== undefined) {
    const price = Number(body.price_fcfa);

    if (!Number.isSafeInteger(price) || price <= 0) {
      return { error: "Le prix doit être un montant entier positif en FCFA." };
    }

    values.price_fcfa = price;
  }

  if (!partial || body.is_popular !== undefined) {
    if (
      body.is_popular !== undefined &&
      typeof body.is_popular !== "boolean"
    ) {
      return { error: "Valeur populaire invalide." };
    }

    values.is_popular = body.is_popular ?? false;
  }

  if (!partial || body.is_active !== undefined) {
    if (
      body.is_active !== undefined &&
      typeof body.is_active !== "boolean"
    ) {
      return { error: "Valeur actif invalide." };
    }

    values.is_active = body.is_active ?? true;
  }

  if (!partial || body.sort_order !== undefined) {
    const order =
      body.sort_order === undefined ? 0 : Number(body.sort_order);

    if (!Number.isSafeInteger(order) || order < 0) {
      return { error: "Ordre d'affichage invalide." };
    }

    values.sort_order = order;
  }

  return { values };
}

async function writeLog(
  adminClient: Awaited<ReturnType<typeof requireAdmin>> extends infer T
    ? T extends { ok: true; adminClient: infer C }
      ? C
      : never
    : never,
  adminId: string,
  action: string,
  packId: string,
  details: Record<string, unknown>
) {
  const { error } = await adminClient
    .from("admin_activity_logs")
    .insert({
      admin_id: adminId,
      action,
      target_type: "coin_pack",
      target_id: packId,
      details,
    });

  if (error) {
    console.error("Journal coins Moshi :", error);
    throw new Error("La journalisation administrative a échoué.");
  }
}

export async function GET() {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) {
      return errorResponse(auth.error, auth.status);
    }

    const { data, error } = await auth.adminClient
      .from("coin_packs")
      .select(
        "id, name, coins, bonus, price_fcfa, is_popular, is_active, sort_order, created_at, updated_at"
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Chargement packs coins :", error);
      return errorResponse("Impossible de charger les packs.", 500);
    }

    return NextResponse.json(
      { packs: data ?? [] },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Admin coins GET :", error);
    return errorResponse("Erreur interne.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) {
      return errorResponse(auth.error, auth.status);
    }

    const body = (await request.json().catch(() => null)) as
      | PackInput
      | null;

    if (!body) {
      return errorResponse("Données invalides.");
    }

    const validated = validatePack(body);

    if ("error" in validated) {
      return errorResponse(validated.error);
    }

    const { data: pack, error } = await auth.adminClient
      .from("coin_packs")
      .insert(validated.values)
      .select()
      .single();

    if (error || !pack) {
      console.error("Création pack coins :", error);
      return errorResponse("Impossible de créer ce pack.", 500);
    }

    try {
      await writeLog(
        auth.adminClient,
        auth.user.id,
        "coin_pack_created",
        pack.id,
        {
          name: pack.name,
          coins: pack.coins,
          bonus: pack.bonus,
          price_fcfa: pack.price_fcfa,
        }
      );
    } catch (logError) {
      await auth.adminClient
        .from("coin_packs")
        .delete()
        .eq("id", pack.id);

      throw logError;
    }

    return NextResponse.json(
      { success: true, pack },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin coins POST :", error);
    return errorResponse(
      error instanceof Error ? error.message : "Erreur interne.",
      500
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) {
      return errorResponse(auth.error, auth.status);
    }

    const body = (await request.json().catch(() => null)) as
      | (PackInput & { id?: string })
      | null;

    if (!body || typeof body.id !== "string") {
      return errorResponse("Identifiant de pack manquant.");
    }

    const id = body.id.trim();

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        id
      )
    ) {
      return errorResponse("Identifiant de pack invalide.");
    }

    const validated = validatePack(body, true);

    if ("error" in validated) {
      return errorResponse(validated.error);
    }

    if (Object.keys(validated.values).length === 0) {
      return errorResponse("Aucune modification fournie.");
    }

    const { data: previous, error: readError } = await auth.adminClient
      .from("coin_packs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (readError || !previous) {
      return errorResponse("Pack introuvable.", 404);
    }

    const { data: pack, error } = await auth.adminClient
      .from("coin_packs")
      .update({
        ...validated.values,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error || !pack) {
      console.error("Modification pack coins :", error);
      return errorResponse("Impossible de modifier ce pack.", 500);
    }

    try {
      await writeLog(
        auth.adminClient,
        auth.user.id,
        "coin_pack_updated",
        id,
        {
          before: previous,
          after: pack,
        }
      );
    } catch (logError) {
      await auth.adminClient
        .from("coin_packs")
        .update({
          name: previous.name,
          coins: previous.coins,
          bonus: previous.bonus,
          price_fcfa: previous.price_fcfa,
          is_popular: previous.is_popular,
          is_active: previous.is_active,
          sort_order: previous.sort_order,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      throw logError;
    }

    return NextResponse.json({ success: true, pack });
  } catch (error) {
    console.error("Admin coins PATCH :", error);
    return errorResponse(
      error instanceof Error ? error.message : "Erreur interne.",
      500
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) {
      return errorResponse(auth.error, auth.status);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return errorResponse("Identifiant de pack manquant.");
    }

    const { data: previous, error: readError } = await auth.adminClient
      .from("coin_packs")
      .select("id, name, is_active")
      .eq("id", id)
      .maybeSingle();

    if (readError || !previous) {
      return errorResponse("Pack introuvable.", 404);
    }

    if (!previous.is_active) {
      return NextResponse.json({
        success: true,
        message: "Ce pack est déjà désactivé.",
      });
    }

    const { error } = await auth.adminClient
      .from("coin_packs")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Désactivation pack :", error);
      return errorResponse("Impossible de désactiver ce pack.", 500);
    }

    try {
      await writeLog(
        auth.adminClient,
        auth.user.id,
        "coin_pack_deactivated",
        id,
        { name: previous.name }
      );
    } catch (logError) {
      await auth.adminClient
        .from("coin_packs")
        .update({
          is_active: previous.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      throw logError;
    }

    return NextResponse.json({
      success: true,
      message: "Pack désactivé.",
    });
  } catch (error) {
    console.error("Admin coins DELETE :", error);
    return errorResponse(
      error instanceof Error ? error.message : "Erreur interne.",
      500
    );
  }
}

import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createUserClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const userClient = await createUserClient();

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return {
      ok: false as const,
      status: 401,
      error: "Authentification requise.",
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Configuration Supabase administrateur manquante.");

    return {
      ok: false as const,
      status: 500,
      error: "Configuration administrateur indisponible.",
    };
  }

  const adminClient = createSupabaseClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const { data: admin, error: adminError } = await adminClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError) {
    console.error("Erreur de vérification administrateur:", adminError);

    return {
      ok: false as const,
      status: 500,
      error: "Impossible de vérifier les droits administrateur.",
    };
  }

  if (!admin) {
    return {
      ok: false as const,
      status: 403,
      error: "Accès réservé à l'administration Moshi.",
    };
  }

  return {
    ok: true as const,
    user,
    adminClient,
  };
}

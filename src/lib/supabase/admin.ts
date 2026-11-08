import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase avec la clé service_role : il CONTOURNE la RLS.
 * À utiliser uniquement dans du code serveur (routes /api, server actions).
 * Ne jamais l'importer depuis un composant "use client".
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

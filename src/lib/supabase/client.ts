
import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

const EXPECTED_SUPABASE_HOST = "jifjeaiqdseetbnvdkpm.supabase.co";

export function createClient() {
  if (!SUPABASE_URL) {
    throw new Error(
      "Configuration manquante : NEXT_PUBLIC_SUPABASE_URL."
    );
  }

  if (!SUPABASE_KEY) {
    throw new Error(
      "Configuration manquante : NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(SUPABASE_URL);
  } catch {
    throw new Error("L'URL Supabase configurée est invalide.");
  }

  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.hostname !== EXPECTED_SUPABASE_HOST
  ) {
    throw new Error(
      "Moshi utilise une URL Supabase incorrecte. Vérifie la configuration du nouveau projet."
    );
  }

  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );
}

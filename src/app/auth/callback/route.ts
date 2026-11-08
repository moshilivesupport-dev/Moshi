import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/** N'autorise que des chemins internes (évite les redirections ouvertes). */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

/**
 * Point d'arrivée des liens envoyés par e-mail :
 *  - ?code=...                 (flux PKCE, modèles d'e-mail par défaut)
 *  - ?token_hash=...&type=...  (modèles personnalisés : fonctionne aussi d'un autre appareil)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const base = (process.env.NEXT_PUBLIC_APP_URL || origin).replace(/\/$/, "");

  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (ok) return NextResponse.redirect(`${base}${next}`);
  return NextResponse.redirect(`${base}/auth/login?error=link_invalid`);
}

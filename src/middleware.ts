import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  // 1. On met d'abord à jour la session Supabase (comme avant)
  const response = await updateSession(request);

  const pathname = request.nextUrl.pathname;

  // 2. Si l'utilisateur essaie d'accéder à une route /seller/*
  if (pathname.startsWith("/seller")) {
    // On recrée un client Supabase léger pour vérifier le rôle de l'utilisateur connecté
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // Lecture seule dans le middleware
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // S'il n'est pas connecté -> redirection vers la connexion
    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    // On récupère son profil pour vérifier son rôle
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // Si ce n'est pas un vendeur (ex: c'est un acheteur), on le bloque et on le redirige vers l'accueil
    if (profile?.role !== "seller") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

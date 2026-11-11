import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  // Ouvert sans être vendeur
  const openSellerPaths = [
    "/seller/onboard",
    "/seller/pending",
    "/seller/live", // tout le monde peut démarrer un live
  ];

  const isOpen = openSellerPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // Produits / dashboard vendeur = toujours réservé vendeur
  if (pathname.startsWith("/seller") && !isOpen) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const login = new URL("/auth/login", request.url);
      login.searchParams.set("next", pathname);
      return NextResponse.redirect(login);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = (profile?.role || "").toLowerCase();
    const isSeller = role === "vendeur" || role === "seller";

    if (!isSeller) {
      return NextResponse.redirect(new URL("/seller/onboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
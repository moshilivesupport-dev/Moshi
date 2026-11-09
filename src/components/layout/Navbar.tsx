"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Home,
  Radio,
  ShoppingBag,
  Wallet,
  User,
  Shield,
  Swords,
  Store,
  PlusCircle,
  Video,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function Navbar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const [role, setRole] = useState<"buyer" | "seller" | "admin" | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !alive) {
        if (alive) setRole(null);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, seller_status")
        .eq("id", user.id)
        .single();
      if (!alive) return;
      if (profile?.role === "admin") setRole("admin");
      else if (
        profile?.role === "seller" ||
        profile?.seller_status === "approved"
      )
        setRole("seller");
      else setRole("buyer");
    })();
    return () => {
      alive = false;
    };
  }, [pathname]);

  const isSeller = role === "seller" || role === "admin";

  const links = isSeller
    ? [
        { href: "/seller", label: "Studio", icon: Store },
        { href: "/seller/live", label: "Live", icon: Video },
        { href: "/seller/products", label: "Publier", icon: PlusCircle },
        { href: "/wallet", label: "Coins", icon: Wallet },
        { href: "/profile", label: "Profil", icon: User },
      ]
    : [
        { href: "/", label: "Accueil", icon: Home },
        { href: "/live", label: "Live", icon: Radio },
        { href: "/battles", label: "Battles", icon: Swords },
        { href: "/shop", label: "Boutique", icon: ShoppingBag },
        { href: "/wallet", label: "Coins", icon: Wallet },
        { href: "/profile", label: "Profil", icon: User },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-anthracite/95 backdrop-blur border-t border-white/5 md:top-0 md:bottom-auto md:border-b md:border-t-0">
      <div className="max-w-5xl mx-auto flex items-center justify-around md:justify-between px-2 h-16">
        <Link href="/" className="hidden md:flex items-center gap-2 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/moshi-logo.jpg"
            alt="Moshi"
            className="h-9 w-auto rounded-md object-contain"
          />
        </Link>

        <div className="flex items-center justify-around w-full md:w-auto md:gap-0.5 overflow-x-auto">
          {links.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/seller"
                ? pathname === "/seller"
                : pathname === href ||
                  (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col md:flex-row items-center gap-0.5 md:gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] md:text-sm transition flex-shrink-0",
                  active ? "text-coral" : "text-muted hover:text-white"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </Link>
            );
          })}
          {(isAdmin || role === "admin") && (
            <Link
              href="/admin"
              className={cn(
                "flex flex-col md:flex-row items-center gap-0.5 md:gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] md:text-sm transition",
                pathname.startsWith("/admin")
                  ? "text-champagne"
                  : "text-muted hover:text-white"
              )}
            >
              <Shield className="w-5 h-5" />
              <span>Admin</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
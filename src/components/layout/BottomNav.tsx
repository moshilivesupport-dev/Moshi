"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Radio, Plus, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/live", label: "Live", icon: Radio },
  { href: "/create", label: "Créer", icon: Plus, central: true },
  { href: "/boutique", label: "Boutique", icon: ShoppingBag },
  { href: "/profile", label: "Profil", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-800 bg-black/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-1">
        {links.map((link) => {
          const Icon = link.icon;
          if (link.central) {
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-label="Ouvrir le studio de création"
                className="relative -top-5 flex flex-col items-center"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-red-500 p-[3px] shadow-lg shadow-pink-500/30 transition active:scale-95">
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-black">
                    <Plus className="h-8 w-8 text-white" strokeWidth={2.7} />
                  </span>
                </span>
              </Link>
            );
          }

          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex min-w-[64px] flex-col items-center justify-center gap-0.5 py-1 transition",
                active ? "text-white" : "text-neutral-500"
              )}
            >
              <Icon className={cn("h-6 w-6", active && "stroke-[2.5]")} />
              <span className="text-[10px] font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Radio,
  Plus,
  ShoppingBag,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  {
    href: "/",
    label: "Accueil",
    icon: Home,
  },
  {
    href: "/live",
    label: "Live",
    icon: Radio,
  },
  {
    href: "/create",          // ou /videos/new selon ton routing
    label: "Créer",
    icon: Plus,
    isCentral: true,
  },
  {
    href: "/boutique",
    label: "Boutique",
    icon: ShoppingBag,
  },
  {
    href: "/profil",          // redirige vers le profil de l'utilisateur connecté
    label: "Profil",
    icon: User,
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Cacher la nav sur certaines pages (ex: feed immersif plein écran si besoin)
  // if (pathname.startsWith("/videos") && !pathname.includes("/new")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur border-t border-neutral-800 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {links.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);

          if (link.isCentral) {
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative -top-4 flex flex-col items-center"
              >
                <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-95 transition">
                  <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>
              </Link>
            );
          }

          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[60px] py-1 transition",
                isActive ? "text-red-500" : "text-neutral-400"
              )}
            >
              <Icon
                className={cn("w-6 h-6", isActive && "stroke-[2.5]")}
              />
              <span className="text-[10px] font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

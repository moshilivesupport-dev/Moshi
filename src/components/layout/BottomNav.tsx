"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Radio, Plus, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import CreateMenu from "@/components/layout/CreateMenu";

const links = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/live", label: "Live", icon: Radio },
  { href: "__create__", label: "Créer", icon: Plus, isCentral: true },
  { href: "/boutique", label: "Boutique", icon: ShoppingBag },
  { href: "/profile", label: "Profil", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-t border-neutral-800">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
          {links.map((link) => {
            if (link.isCentral) {
              return (
                <button
                  key="create"
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="relative -top-5 flex flex-col items-center"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-red-500 via-pink-500 to-yellow-400 p-[2px] shadow-lg shadow-red-500/30 active:scale-95 transition">
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                      <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                </button>
              );
            }

            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 min-w-[64px] py-1 transition",
                  isActive ? "text-white" : "text-neutral-500"
                )}
              >
                <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5]")} />
                <span className="text-[10px] font-medium">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <CreateMenu open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  );
}
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, Plus, ShoppingBag, User } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/shop", label: "Boutique", icon: ShoppingBag },
  { href: "/create", label: "Créer", icon: Plus, central: true },
  { href: "/messages", label: "Messagerie", icon: MessageCircle },
  { href: "/profile/me", label: "Profil", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white/90 backdrop-blur-xl pb-safe">
      <div className="mx-auto flex h-[72px] max-w-lg items-center justify-around px-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

          // Bouton central "+"
          if (link.central) {
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-label="Créer"
                className="relative -top-5 flex flex-col items-center"
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-[#FF8FB1] via-[#9D7BEA] to-[#60A5FA] p-[2px] shadow-lg shadow-purple-200/50"
                >
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
                    <Plus className="h-7 w-7 text-[#9D7BEA]" strokeWidth={3} />
                  </div>
                </motion.div>
              </Link>
            );
          }

          // Autres boutons
          return (
            <Link
              key={link.href}
              href={link.href}
              className="relative flex min-w-[60px] flex-col items-center justify-center gap-1 py-2"
            >
              <Icon
                className={cn(
                  "h-6 w-6 transition-colors",
                  isActive ? "text-[#9D7BEA]" : "text-gray-400"
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={cn(
                  "text-[10px] font-semibold transition-colors",
                  isActive ? "text-[#9D7BEA]" : "text-gray-400"
                )}
              >
                {link.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -bottom-1 h-1 w-1 rounded-full bg-[#9D7BEA]"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
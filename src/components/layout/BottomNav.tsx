"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageCircle,
  Plus,
  ShoppingBag,
  User,
} from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import CreateMenu from "./CreateMenu";
import { useMoshiPreferences } from "@/components/providers/MoshiPreferencesProvider";

const links = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/shop", label: "Boutique", icon: ShoppingBag },
  {
    href: "/create",
    label: "Créer",
    icon: Plus,
    central: true,
  },
  {
    href: "/messages",
    label: "Messagerie",
    icon: MessageCircle,
    badge: 3,
  },
  { href: "/profile/me", label: "Profil", icon: User },
];

const hiddenRoutes = [
  "/admin",
  "/seller",
  "/auth",
  "/live",
];

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useMoshiPreferences();

  const [isCreateMenuOpen, setIsCreateMenuOpen] =
    useState(false);

  const isProductDetail =
    /^\/shop\/[^/]+\/?$/.test(pathname);

  const shouldHideNavigation =
    isProductDetail ||
    hiddenRoutes.some(
      (route) =>
        pathname === route ||
        pathname.startsWith(`${route}/`)
    );

  if (shouldHideNavigation) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 z-50 pb-safe">
        <nav
          aria-label={t("Navigation principale")}
          className="mx-auto flex h-[72px] max-w-lg items-center justify-around rounded-[28px] bg-white/95 px-2 shadow-lg backdrop-blur-xl"
        >
          {links.map((link) => {
            const Icon = link.icon;

            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            if (link.central) {
              return (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => setIsCreateMenuOpen(true)}
                  aria-label={t(link.label)}
                  className="relative -top-3 flex flex-col items-center"
                >
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className="flex h-[60px] w-[60px] items-center justify-center rounded-2xl moshi-gradient shadow-lg shadow-purple-200/50"
                  >
                    <Plus
                      className="h-8 w-8 text-white"
                      strokeWidth={2.5}
                    />
                  </motion.div>
                </button>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative flex min-w-[60px] flex-col items-center justify-center gap-1 py-2"
              >
                <div className="relative">
                  <Icon
                    className={cn(
                      "h-[26px] w-[26px] transition-colors",
                      isActive
                        ? "text-[#9D7BEA]"
                        : "text-gray-600"
                    )}
                    strokeWidth={isActive ? 2.5 : 2}
                  />

                  {link.badge && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF4B72] text-[9px] font-bold text-white">
                      {link.badge}
                    </span>
                  )}
                </div>

                <span
                  className={cn(
                    "text-[10px] font-semibold transition-colors",
                    isActive
                      ? "text-[#9D7BEA]"
                      : "text-gray-600"
                  )}
                >
                  {t(link.label)}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <CreateMenu
        isOpen={isCreateMenuOpen}
        onClose={() => setIsCreateMenuOpen(false)}
      />
    </>
  );
}
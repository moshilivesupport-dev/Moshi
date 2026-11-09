"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Radio,
  Plus,
  ShoppingBag,
  User,
  Store,
  Video,
  PackagePlus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavbarProps {
  role?: string | null;
  sellerStatus?: string | null;
}

export default function Navbar({ role, sellerStatus }: NavbarProps) {
  const pathname = usePathname();
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  // Liste des liens de navigation principaux
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
      href: "#", // Bouton central interactif (ouvre le menu)
      label: "Créer",
      icon: Plus,
      isCentral: true,
    },
    {
      href: "/shop",
      label: "Boutique",
      icon: ShoppingBag,
    },
    ...(role === "seller"
      ? [
          {
            href: "/seller/dashboard",
            label: "Vendeur",
            icon: Store,
          },
        ]
      : []),
    {
      href: "/profile/me",
      label: "Profil",
      icon: User,
    },
  ];

  return (
    <>
      {/* Menu Modal / Overlay de création central */}
      {isCreateMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end pb-24 px-4 animate-in fade-in duration-200">
          <div className="max-w-md mx-auto w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col gap-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <span className="text-white font-semibold text-sm">Créer du contenu</span>
              <button
                onClick={() => setIsCreateMenuOpen(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Option 1 : Ajouter une vidéo */}
            <Link
              href="/videos/new"
              onClick={() => setIsCreateMenuOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 text-white transition"
            >
              <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <div className="font-medium text-sm">Publier une vidéo</div>
                <div className="text-xs text-neutral-400">Partage une vidéo style TikTok</div>
              </div>
            </Link>

            {/* Option 2 : Ajouter un produit (visible si vendeur ou selon la logique) */}
            <Link
              href="/seller/products/new"
              onClick={() => setIsCreateMenuOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 text-white transition"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center">
                <PackagePlus className="w-5 h-5" />
              </div>
              <div>
                <div className="font-medium text-sm">Ajouter un produit</div>
                <div className="text-xs text-neutral-400">Mets un article en vente dans ta boutique</div>
              </div>
            </Link>

            {/* Option 3 : Lancer un Live */}
            <Link
              href="/live/start"
              onClick={() => setIsCreateMenuOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 text-white transition"
            >
              <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <div className="font-medium text-sm">Lancer un Live</div>
                <div className="text-xs text-neutral-400">Interagis en direct avec ta communauté</div>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Barre de navigation fixe */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur border-t border-neutral-800 safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {links.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : link.href !== "#" && pathname.startsWith(link.href);

            if (link.isCentral) {
              return (
                <button
                  key="central-btn"
                  onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
                  className="relative -top-4 flex flex-col items-center focus:outline-none"
                >
                  <div className={cn(
                    "w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30 active:scale-95 transition duration-200",
                    isCreateMenuOpen && "rotate-45 bg-neutral-700"
                  )}>
                    <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
                  </div>
                </button>
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
    </>
  );
}

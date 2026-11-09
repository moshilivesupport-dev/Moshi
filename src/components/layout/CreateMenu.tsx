"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, X } from "lucide-react";
import { SELLER_ACTIONS } from "@/components/seller/SellerActions";

/** Bouton « + » flottant (style TikTok) réservé aux vendeurs approuvés et aux admins. */
export function CreateMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  // Pas de bouton sur les pages de création, d'authentification ni pendant le visionnage d'un live
  const hidden =
    pathname.startsWith("/seller") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/videos") ||
    pathname.startsWith("/live/") ||
    pathname === "/stories/new";
  if (hidden) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Fermer le menu de création" : "Créer"}
        className="fixed z-[70] right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-8 w-14 h-14 rounded-full bg-gradient-to-br from-coral to-champagne shadow-lg shadow-coral/30 flex items-center justify-center active:scale-95 transition"
      >
        {open ? <X className="w-7 h-7 text-onyx" /> : <Plus className="w-7 h-7 text-onyx" />}
      </button>

      {open && (
        <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute left-0 right-0 bottom-0 rounded-t-3xl bg-anthracite border-t border-white/10 p-4 pb-28 md:max-w-md md:left-auto md:right-4 md:bottom-24 md:rounded-3xl md:pb-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4 md:hidden" />
            <p className="text-sm font-semibold text-white mb-3 px-1">Créer</p>
            <div className="space-y-2">
              {SELLER_ACTIONS.map(({ href, label, desc, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-2xl bg-onyx border border-white/5 p-3 hover:border-coral/40 transition"
                >
                  <div className="w-11 h-11 rounded-xl bg-coral/15 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-coral" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-xs text-muted">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

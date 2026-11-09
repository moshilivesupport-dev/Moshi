import Link from "next/link";
import { Radio, PackagePlus, Sparkles, Clapperboard, BarChart3 } from "lucide-react";

export const SELLER_ACTIONS = [
  { href: "/seller/live", label: "Passer en live", desc: "Diffusez en direct", icon: Radio },
  { href: "/seller/products/new", label: "Publier un article", desc: "Ajoutez un produit à vendre", icon: PackagePlus },
  { href: "/stories/new", label: "Ajouter une story", desc: "Visible pendant 24 h", icon: Sparkles },
  { href: "/videos/new", label: "Publier une vidéo", desc: "Clip de 45 s maximum", icon: Clapperboard },
  { href: "/seller/analytics", label: "Mes statistiques", desc: "Ventes et audience", icon: BarChart3 },
];

/** Grille d'actions de l'espace vendeur (accueil et profil). */
export function SellerActionGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {SELLER_ACTIONS.map(({ href, label, desc, icon: Icon }, i) => (
        <Link
          key={href}
          href={href}
          className={`rounded-2xl border border-white/10 bg-onyx p-4 hover:border-coral/40 transition ${
            i === 0 ? "col-span-2 bg-coral/10 border-coral/30" : ""
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-coral/15 flex items-center justify-center mb-3">
            <Icon className="w-5 h-5 text-coral" />
          </div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs text-muted mt-0.5">{desc}</p>
        </Link>
      ))}
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Radio,
  PackagePlus,
  Clapperboard,
  BarChart3,
  ShoppingBag,
  Settings,
} from "lucide-react";

export default async function SellerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, role, seller_status, avatar_url")
    .eq("id", user.id)
    .single();

  const isSeller =
    profile?.role === "seller" ||
    profile?.role === "admin" ||
    profile?.seller_status === "approved";

  if (!isSeller) redirect("/");

  const actions = [
    {
      href: "/seller/live",
      title: "Passer en live",
      desc: "Diffuse maintenant",
      icon: Radio,
      color: "bg-coral text-white",
    },
    {
      href: "/seller/products",
      title: "Publier un produit",
      desc: "Ajouter un article",
      icon: PackagePlus,
      color: "bg-champagne text-onyx",
    },
    {
      href: "/stories",
      title: "Story 24 h",
      desc: "Story avec produit",
      icon: Clapperboard,
      color: "bg-white/10 text-white",
    },
    {
      href: "/seller/analytics",
      title: "Statistiques",
      desc: "Vues et ventes",
      icon: BarChart3,
      color: "bg-white/10 text-white",
    },
    {
      href: "/shop",
      title: "Ma boutique",
      desc: "Produits publiés",
      icon: ShoppingBag,
      color: "bg-white/10 text-white",
    },
    {
      href: "/settings",
      title: "Paramètres",
      desc: "Compte",
      icon: Settings,
      color: "bg-white/10 text-white",
    },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-8 pb-28">
      <div className="flex items-center gap-3 mb-8">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt=""
            className="w-14 h-14 rounded-full object-cover border-2 border-coral"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-anthracite" />
        )}
        <div>
          <p className="text-xs text-champagne font-medium uppercase tracking-wide">
            Espace vendeur
          </p>
          <h1 className="text-xl font-bold text-white">
            @{profile?.username || "vendeur"}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map(({ href, title, desc, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="card flex flex-col gap-3 p-4 hover:border-coral/40 transition border border-white/5"
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">{title}</p>
              <p className="text-[11px] text-muted mt-0.5 leading-snug">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <Link
        href="/seller/live"
        className="mt-6 flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-coral text-white font-bold text-lg shadow-lg shadow-coral/30"
      >
        <Radio className="w-6 h-6" />
        Passer en live maintenant
      </Link>
    </div>
  );
}
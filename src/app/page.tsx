import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Radio, ShoppingBag, Coins, Globe, Clapperboard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SellerActionGrid } from "@/components/seller/SellerActions";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { username: string | null; full_name: string | null; role: string; seller_status: string } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, full_name, role, seller_status")
      .eq("id", user.id)
      .maybeSingle();
    profile = data;
  }

  const isAdmin = profile?.role === "admin";
  const isCreator = isAdmin || (profile?.role === "seller" && profile?.seller_status === "approved");
  const isPending = profile?.role === "seller" && profile?.seller_status === "pending";
  const canApply =
    !!profile && !isCreator && !isPending && ["none", "rejected"].includes(profile.seller_status);
  const wantsSeller = user?.user_metadata?.account_type === "seller";
  const displayName = profile?.full_name || profile?.username || "";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Hero */}
      <section className="text-center py-8 md:py-16">
        {user ? (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-coral/10 border border-coral/20 text-coral text-sm mb-6">
            {isAdmin ? "Administrateur" : isCreator ? "Espace vendeur" : "Compte acheteur"}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-coral/10 border border-coral/20 text-coral text-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-coral animate-pulse" />
            Live Shopping Platform
          </div>
        )}
        <div className="flex justify-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/moshi-logo.jpg" alt="Moshi" className="h-16 md:h-20 w-auto rounded-xl shadow-lg shadow-coral/10" />
        </div>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-white">
          {user ? `Bonjour ${displayName}` : "Live Shopping"}
        </h1>
        <p className="text-lg text-muted max-w-xl mx-auto mb-8">
          {isCreator
            ? "Publiez vos articles, passez en live et animez votre communauté."
            : user
            ? "Regardez les lives, découvrez la boutique et envoyez des gifts à vos vendeurs préférés."
            : "Achetez et vendez en direct. Envoyez des gifts, suivez vos vendeurs préférés, multi-devises & multi-langues."}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/live">
            <Button size="lg" className="w-full sm:w-auto">
              <Radio className="w-5 h-5 mr-2" /> Voir les lives
            </Button>
          </Link>
          {user ? (
            <Link href="/shop">
              <Button size="lg" variant="gold" className="w-full sm:w-auto">
                <ShoppingBag className="w-5 h-5 mr-2" /> Boutique
              </Button>
            </Link>
          ) : (
            <Link href="/auth/register">
              <Button size="lg" variant="gold" className="w-full sm:w-auto">
                Créer un compte
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Espace vendeur : seulement pour les vendeurs approuvés et les admins */}
      {isCreator && (
        <section className="card mb-8">
          <h2 className="text-lg font-bold text-white mb-1">Espace vendeur</h2>
          <p className="text-sm text-muted mb-4">Tout ce qu&apos;il faut pour vendre, au même endroit.</p>
          <SellerActionGrid />
        </section>
      )}

      {/* Demande vendeur en cours */}
      {isPending && (
        <section className="card border-champagne/30 mb-8 text-center">
          <h2 className="text-lg font-bold text-white mb-1">Demande vendeur en cours</h2>
          <p className="text-sm text-muted">Votre dossier est en cours de vérification. Vous serez averti dès qu&apos;il sera validé.</p>
        </section>
      )}

      {/* Acheteur : devenir vendeur / terminer l'inscription vendeur */}
      {canApply && (
        <section className="card bg-gradient-to-r from-anthracite to-onyx border-champagne/20 text-center py-8 mb-8">
          <h2 className="text-xl font-bold mb-2 text-white">
            {wantsSeller ? "Finalisez votre profil vendeur" : "Devenez vendeur"}
          </h2>
          <p className="text-muted mb-5 max-w-md mx-auto text-sm">
            Photo de profil · Pays · Âge · Genre. Une fois votre demande envoyée, vous accédez à l&apos;espace vendeur.
          </p>
          <Link href="/seller/onboard">
            <Button variant="gold">{wantsSeller ? "Terminer mon inscription" : "Devenir vendeur"}</Button>
          </Link>
        </section>
      )}

      {/* Raccourcis acheteur / visiteur */}
      {user && !isCreator && (
        <section className="grid grid-cols-3 gap-3 mb-8">
          {[
            { href: "/live", label: "Lives", icon: Radio },
            { href: "/videos", label: "Vidéos", icon: Clapperboard },
            { href: "/wallet", label: "Coins", icon: Coins },
          ].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="card text-center py-5 hover:border-coral/40 transition">
              <Icon className="w-6 h-6 text-coral mx-auto mb-2" />
              <span className="text-sm text-white">{label}</span>
            </Link>
          ))}
        </section>
      )}

      {/* Présentation : visiteurs non connectés uniquement */}
      {!user && (
        <>
          <section className="grid md:grid-cols-3 gap-6 py-8">
            {[
              { icon: Radio, title: "Live Shopping", desc: "Streams interactifs style TikTok avec chat multilingue et gifts animés." },
              { icon: Coins, title: "Coins & Gifts", desc: "Portefeuille virtuel, Golden Rose, Super Moshi Star et plus encore." },
              { icon: Globe, title: "10 langues · 10 devises", desc: "XOF, EUR, USD, GBP, CAD, NGN, GHS, KES, CNY, AED." },
            ].map((f) => (
              <div key={f.title} className="card text-center">
                <div className="w-12 h-12 rounded-2xl bg-coral/10 flex items-center justify-center mx-auto mb-4">
                  <f.icon className="w-6 h-6 text-coral" />
                </div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-muted">{f.desc}</p>
              </div>
            ))}
          </section>

          <section className="card bg-gradient-to-r from-anthracite to-onyx border-champagne/20 text-center py-10">
            <h2 className="text-2xl font-bold mb-2">Vous voulez vendre ?</h2>
            <p className="text-muted mb-6 max-w-md mx-auto">
              Créez un compte vendeur : photo de profil, pays, âge, genre. Puis publiez et passez en live.
            </p>
            <Link href="/auth/register?type=seller">
              <Button variant="gold">Créer un compte vendeur</Button>
            </Link>
          </section>
        </>
      )}
    </div>
  );
}

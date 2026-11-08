import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Radio, ShoppingBag, Coins, Globe } from "lucide-react";

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Hero */}
      <section className="text-center py-12 md:py-20">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-coral/10 border border-coral/20 text-coral text-sm mb-6">
          <span className="w-2 h-2 rounded-full bg-coral animate-pulse" />
          Live Shopping Platform
        </div>
        <div className="flex justify-center mb-6">
          <img src="/brand/moshi-logo.jpg" alt="Moshi" className="h-16 md:h-20 w-auto rounded-xl shadow-lg shadow-coral/10" />
        </div>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-white">
          Live Shopping
        </h1>
        <p className="text-lg text-muted max-w-xl mx-auto mb-8">
          Achetez et vendez en direct. Envoyez des gifts, suivez vos vendeurs préférés,
          multi-devises & multi-langues.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/live">
            <Button size="lg" className="w-full sm:w-auto">
              <Radio className="w-5 h-5 mr-2" /> Voir les lives
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button size="lg" variant="gold" className="w-full sm:w-auto">
              Créer un compte
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-6 py-12">
        {[
          {
            icon: Radio,
            title: "Live Shopping",
            desc: "Streams interactifs style TikTok avec chat multilingue et gifts animés.",
          },
          {
            icon: Coins,
            title: "Coins & Gifts",
            desc: "Portefeuille virtuel, Golden Rose, Super Moshi Star et plus encore.",
          },
          {
            icon: Globe,
            title: "10 langues · 10 devises",
            desc: "XOF, EUR, USD, GBP, CAD, NGN, GHS, KES, CNY, AED.",
          },
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

      {/* CTA Seller */}
      <section className="card bg-gradient-to-r from-anthracite to-onyx border-champagne/20 text-center py-10">
        <h2 className="text-2xl font-bold mb-2">Devenez vendeur en 4 étapes</h2>
        <p className="text-muted mb-6 max-w-md mx-auto">
          Photo de profil · Pays · Âge · Genre. Validation rapide par l’équipe Moshi.
        </p>
        <Link href="/seller/onboard">
          <Button variant="gold">Commencer l’onboarding</Button>
        </Link>
      </section>
    </div>
  );
}

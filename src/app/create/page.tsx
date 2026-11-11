import Link from "next/link";
import { Video, Radio, Package } from "lucide-react";

export default function CreatePage() {
  return (
    <div className="min-h-[100dvh] bg-black text-white px-4 pt-10 pb-24">
      <h1 className="text-2xl font-bold text-center mb-2">Créer</h1>
      <p className="text-neutral-400 text-sm text-center mb-10">
        Que voulez-vous publier ?
      </p>

      <div className="max-w-sm mx-auto space-y-4">
        <Link
          href="/videos/new"
          className="flex items-center gap-4 p-5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-red-500/50 transition"
        >
          <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center">
            <Video className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="font-semibold">Vidéo courte</p>
            <p className="text-sm text-neutral-400">Max 45 secondes</p>
          </div>
        </Link>

        <Link
          href="/seller/live"
          className="flex items-center gap-4 p-5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-red-500/50 transition"
        >
          <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center">
            <Radio className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="font-semibold">Live Shopping</p>
            <p className="text-sm text-neutral-400">Vendez en direct</p>
          </div>
        </Link>

        <Link
          href="/seller/products/new"
          className="flex items-center gap-4 p-5 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-red-500/50 transition"
        >
          <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center">
            <Package className="w-6 h-6 text-neutral-300" />
          </div>
          <div>
            <p className="font-semibold">Produit</p>
            <p className="text-sm text-neutral-400">Ajouter à la boutique</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
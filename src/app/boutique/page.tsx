import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export default function BoutiquePage() {
  return (
    <div className="min-h-[100dvh] bg-black text-white px-4 pt-8 pb-24">
      <h1 className="text-2xl font-bold mb-2">Boutique</h1>
      <p className="text-neutral-400 text-sm mb-8">
        Produits des vendeurs Moshi
      </p>

      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mb-4">
          <ShoppingBag className="w-8 h-8 text-neutral-400" />
        </div>
        <p className="text-neutral-400 mb-6">
          La boutique se remplit avec les produits des vendeurs.
        </p>
        <Link
          href="/seller/products/new"
          className="px-6 py-2.5 rounded-full bg-red-500 text-sm font-semibold"
        >
          Ajouter un produit
        </Link>
      </div>
    </div>
  );
}
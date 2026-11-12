"use client";

import { ShoppingBag, X } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  stock: number;
}

interface LiveProductPinProps {
  product: Product | null;
  onClose: () => void;
}

export default function LiveProductPin({ product, onClose }: LiveProductPinProps) {
  if (!product) return null;

  return (
    <div className="absolute bottom-36 left-4 right-4 z-40 animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className="bg-neutral-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-3 flex items-center gap-3 shadow-2xl shadow-black/50">
        {/* Image du produit */}
        <div className="w-16 h-16 rounded-xl bg-neutral-800 overflow-hidden flex-shrink-0 relative">
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          <div className="absolute top-1 right-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-bold text-white">
            x{product.stock}
          </div>
        </div>

        {/* Infos produit */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white truncate">{product.name}</h4>
          <p className="text-red-500 font-bold text-lg">{product.price.toLocaleString("fr-FR")} €</p>
        </div>

        {/* Bouton d'action */}
        <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-1.5 active:scale-95 transition-transform">
          <ShoppingBag className="w-4 h-4" />
          Acheter
        </button>

        {/* Bouton fermer (pour le host ou si l'user ferme) */}
        <button 
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}

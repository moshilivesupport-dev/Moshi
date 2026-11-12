import Link from "next/link";

interface ProductResultProps {
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    profiles?: {
      username: string | null;
      avatar_url: string | null;
    } | null;
  };
}

export default function ProductResult({ product }: ProductResultProps) {
  const sellerName = product.profiles?.username || "Vendeur";

  return (
    <Link
      href={`/boutique/${product.id}`}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-900 transition-colors"
    >
      {/* Image */}
      <div className="w-16 h-16 rounded-xl bg-neutral-800 overflow-hidden flex-shrink-0">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-600">
            📦
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white truncate">{product.name}</h3>
        <p className="text-xs text-neutral-400 mt-0.5">par {sellerName}</p>
        <p className="text-sm font-bold text-red-500 mt-1">
          {product.price.toLocaleString("fr-FR")} €
        </p>
      </div>
    </Link>
  );
}

import { createClient } from "@/lib/supabase/server";
import { formatCurrency, CurrencyCode } from "@/lib/currency";
import Link from "next/link";

export default async function ShopPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, title, price, currency, product_images(url)")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(24);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-6">Boutique</h1>
      {!products || products.length === 0 ? (
        <div className="card text-center py-16 text-muted">Aucun produit pour le moment.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p: any) => (
            <Link key={p.id} href={`/shop/${p.id}`} className="card p-0 overflow-hidden group">
              <div className="aspect-square bg-onyx">
                {p.product_images?.[0]?.url ? (
                  <img src={p.product_images[0].url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
                ) : null}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-white truncate">{p.title}</p>
                <p className="text-champagne text-sm font-semibold mt-1">
                  {formatCurrency(p.price, p.currency as CurrencyCode)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

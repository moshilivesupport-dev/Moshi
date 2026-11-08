import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, CurrencyCode } from "@/lib/currency";
import { OneClickBuy } from "@/components/orders/OneClickBuy";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("id, seller_id, title, description, price, currency, stock, is_active, product_images(url, position), profiles(username)")
    .eq("id", id)
    .maybeSingle();

  if (!product || !product.is_active) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const images = [...(product.product_images ?? [])].sort(
    (a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)
  );
  const seller: any = Array.isArray(product.profiles) ? product.profiles[0] : product.profiles;
  const isOwner = user?.id === product.seller_id;
  const outOfStock = (product.stock ?? 0) <= 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link href="/shop" className="text-sm text-muted hover:text-white">← Boutique</Link>

      <div className="grid md:grid-cols-2 gap-6 mt-4">
        <div className="space-y-2">
          <div className="aspect-square bg-onyx rounded-2xl overflow-hidden">
            {images[0]?.url ? <img src={images[0].url} alt={product.title} className="w-full h-full object-cover" /> : null}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {images.slice(1, 5).map((img: any) => (
                <div key={img.url} className="aspect-square bg-onyx rounded-xl overflow-hidden">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-white">{product.title}</h1>
          {seller?.username && <p className="text-sm text-muted">Vendu par @{seller.username}</p>}
          <p className="text-champagne text-2xl font-semibold">
            {formatCurrency(Number(product.price), product.currency as CurrencyCode)}
          </p>
          {product.description && <p className="text-sm text-muted whitespace-pre-line">{product.description}</p>}
          <p className="text-xs text-muted">
            {outOfStock ? "Rupture de stock" : `${product.stock} en stock`} · Paiement sécurisé (escrow).
            Les frais de paiement CinetPay sont ajoutés au total sur la page de paiement.
          </p>

          {isOwner ? (
            <p className="text-sm text-muted">C&apos;est votre produit.</p>
          ) : (
            <OneClickBuy
              productId={product.id}
              title={product.title}
              price={Number(product.price)}
              currency={product.currency}
              disabled={outOfStock}
            />
          )}
        </div>
      </div>
    </div>
  );
}

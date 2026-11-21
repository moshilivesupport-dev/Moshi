
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Package,
  Loader2,
  ArrowLeft,
  Search,
  Heart,
  MessageCircle,
} from "lucide-react";

type Product = {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
  category: string | null;
};

type ProductStats = {
  likes: number;
  comments: number;
  liked: boolean;
};

export default function ShopPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Record<string, ProductStats>>({});
  const [images, setImages] = useState<Record<string, string[]>>({});
  const [imageIndexes, setImageIndexes] = useState<Record<string, number>>({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [liking, setLiking] = useState<string[]>([]);

  const normalizeImage = useCallback(
    (value: string | null) => {
      if (!value?.trim()) return null;

      const clean = value.trim();

      if (/^(https?:|data:)/i.test(clean)) return clean;

      return supabase.storage
        .from("products")
        .getPublicUrl(clean.replace(/^\/+/, "")).data.publicUrl;
    },
    [supabase]
  );

  const loadProducts = useCallback(async () => {
    setLoading(true);

    try {
      const [
        { data: auth, error: authError },
        { data, error },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("products")
          .select("id,title,price,image_url,category")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
      ]);

      if (authError) throw authError;
      if (error) throw error;

      const user = auth.user;
      setCurrentUser(user);

      const rows = (data || []) as Product[];
      setProducts(rows);

      if (!rows.length) {
        setStats({});
        setImages({});
        setImageIndexes({});
        setFailedImages({});
        return;
      }

      const ids = rows.map((product) => product.id);

      const [
        photosResult,
        likesResult,
        commentsResult,
        myLikesResult,
      ] = await Promise.all([
        supabase
          .from("product_images")
          .select("product_id,url,position")
          .in("product_id", ids)
          .order("position", { ascending: true }),

        supabase
          .from("product_likes")
          .select("product_id")
          .in("product_id", ids),

        supabase
          .from("product_comments")
          .select("product_id")
          .in("product_id", ids)
          .is("parent_id", null),

        user
          ? supabase
              .from("product_likes")
              .select("product_id")
              .eq("user_id", user.id)
              .in("product_id", ids)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (photosResult.error) throw photosResult.error;
      if (likesResult.error) throw likesResult.error;
      if (commentsResult.error) throw commentsResult.error;
      if (myLikesResult.error) throw myLikesResult.error;

      const photosByProduct: Record<string, string[]> = {};

      for (const photo of photosResult.data || []) {
        const url = normalizeImage(photo.url);

        if (url) {
          (photosByProduct[photo.product_id] ||= []).push(url);
        }
      }

      const nextImages: Record<string, string[]> = {};

      for (const product of rows) {
        nextImages[product.id] = [
          ...new Set(
            [
              normalizeImage(product.image_url),
              ...(photosByProduct[product.id] || []),
            ].filter((url): url is string => Boolean(url))
          ),
        ];
      }

      setImages(nextImages);
      setImageIndexes({});
      setFailedImages({});

      const nextStats: Record<string, ProductStats> = {};

      for (const product of rows) {
        nextStats[product.id] = {
          likes: 0,
          comments: 0,
          liked: false,
        };
      }

      for (const row of likesResult.data || []) {
        if (nextStats[row.product_id]) {
          nextStats[row.product_id].likes++;
        }
      }

      for (const row of commentsResult.data || []) {
        if (nextStats[row.product_id]) {
          nextStats[row.product_id].comments++;
        }
      }

      for (const row of myLikesResult.data || []) {
        if (nextStats[row.product_id]) {
          nextStats[row.product_id].liked = true;
        }
      }

      setStats(nextStats);
    } catch (error) {
      console.error("Erreur chargement boutique :", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, normalizeImage]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const toggleLike = async (productId: string) => {
    if (!currentUser) {
      router.push("/auth/login");
      return;
    }

    if (liking.includes(productId)) return;

    const previous = stats[productId];
    if (!previous) return;

    setLiking((items) => [...items, productId]);

    setStats((current) => ({
      ...current,
      [productId]: {
        ...current[productId],
        liked: !previous.liked,
        likes: Math.max(
          0,
          current[productId].likes + (previous.liked ? -1 : 1)
        ),
      },
    }));

    try {
      const result = previous.liked
        ? await supabase
            .from("product_likes")
            .delete()
            .eq("product_id", productId)
            .eq("user_id", currentUser.id)
        : await supabase.from("product_likes").insert({
            product_id: productId,
            user_id: currentUser.id,
          });

      if (result.error) throw result.error;
    } catch (error: any) {
      setStats((current) => ({
        ...current,
        [productId]: previous,
      }));

      alert("Impossible de modifier le J'aime : " + error.message);
    } finally {
      setLiking((items) =>
        items.filter((item) => item !== productId)
      );
    }
  };

  const handleImageError = (productId: string) => {
    const sources = images[productId] || [];
    const index = imageIndexes[productId] || 0;

    if (index + 1 < sources.length) {
      setImageIndexes((current) => ({
        ...current,
        [productId]: index + 1,
      }));
    } else {
      setFailedImages((current) => ({
        ...current,
        [productId]: true,
      }));
    }
  };

  const query = search.toLowerCase().trim();

  const filtered = products.filter(
    (product) =>
      product.title.toLowerCase().includes(query) ||
      (product.category || "").toLowerCase().includes(query)
  );

  return (
    <div className="min-h-[100dvh] bg-moshi-bg pb-28">
      <header className="sticky top-0 z-20 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="px-4 pt-4 pb-3">
          <div className="mb-4 flex items-center gap-3">
            <Link
              href="/"
              aria-label="Retour à l'accueil"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 text-moshi-text"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <h1 className="flex-1 text-xl font-extrabold text-moshi-text">
              Boutique
            </h1>

            <span className="text-sm text-gray-400">
              {products.length} produit(s)
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full rounded-2xl bg-gray-100 py-4 pl-12 pr-4 text-base outline-none focus:ring-2 focus:ring-[#9D7BEA]/25"
            />
          </div>
        </div>
      </header>

      <main className="py-5">
        <div className="mb-4 flex items-center justify-between px-4">
          <h2 className="text-lg font-extrabold text-moshi-text">
            {search ? "Résultats de recherche" : "Découvrir les produits"}
          </h2>

          <span className="text-xs text-gray-400">
            {filtered.length} article(s)
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-[#9D7BEA]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-24">
            <Package className="h-14 w-14 text-gray-300" />

            <p className="text-center text-sm text-gray-500">
              {search
                ? "Aucun produit ne correspond à ta recherche."
                : "Aucun produit disponible pour le moment."}
            </p>
          </div>
        ) : (
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {filtered.map((product) => {
              const itemStats = stats[product.id] || {
                likes: 0,
                comments: 0,
                liked: false,
              };

              const sources = images[product.id] || [];
              const index = imageIndexes[product.id] || 0;
              const imageUrl = sources[index];
              const noImage = !imageUrl || failedImages[product.id];

              return (
                <article
                  key={product.id}
                  className="w-[76vw] min-w-[245px] max-w-[285px] shrink-0 snap-start overflow-hidden rounded-[26px] bg-white shadow-sm ring-1 ring-black/[0.03]"
                >
                  <Link href={`/shop/${product.id}`} className="block">
                    <div className="relative aspect-square w-full overflow-hidden bg-[#F1EFF6]">
                      {!noImage ? (
                        <Image
                          key={imageUrl}
                          src={imageUrl}
                          alt={product.title}
                          fill
                          sizes="(max-width: 640px) 76vw, 285px"
                          className="object-cover"
                          unoptimized
                          onError={() => handleImageError(product.id)}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#C9C6D2]">
                          <Package size={48} strokeWidth={1.5} />
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="p-4">
                    <Link href={`/shop/${product.id}`} className="block">
                      <h3 className="line-clamp-2 min-h-10 text-[15px] font-bold leading-5 text-moshi-text">
                        {product.title}
                      </h3>

                      {product.category && (
                        <p className="mt-1 truncate text-xs text-gray-400">
                          {product.category}
                        </p>
                      )}

                      <p className="mt-2 text-xl font-extrabold text-[#9D7BEA]">
                        {Number(product.price).toLocaleString("fr-FR")} FCFA
                      </p>
                    </Link>

                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                      <button
                        type="button"
                        onClick={() => void toggleLike(product.id)}
                        disabled={liking.includes(product.id)}
                        className={`flex items-center gap-2 text-sm font-bold disabled:opacity-50 ${
                          itemStats.liked
                            ? "text-[#D83D83]"
                            : "text-gray-500"
                        }`}
                      >
                        <Heart
                          className={`h-5 w-5 ${
                            itemStats.liked ? "fill-current" : ""
                          }`}
                        />
                        {itemStats.likes}
                      </button>

                      <Link
                        href={`/shop/${product.id}#comments`}
                        className="flex items-center gap-2 text-sm font-semibold text-gray-500"
                      >
                        <MessageCircle className="h-5 w-5" />
                        {itemStats.comments}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && filtered.length > 1 && (
          <p className="px-4 text-center text-xs text-gray-400">
            Fais glisser pour découvrir les autres produits
          </p>
        )}
      </main>
    </div>
  );
}

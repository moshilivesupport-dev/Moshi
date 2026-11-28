"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  Loader2,
  ArrowLeft,
  Search,
  Heart,
  MessageCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useMoshiPreferences } from "@/components/providers/MoshiPreferencesProvider";
import { getProductImageUrls } from "@/lib/products";

type CategoryRelation =
  | { name: string }
  | { name: string }[]
  | null;

type Product = {
  id: string;
  title: string;
  price: number;
  currency: string;
  images: unknown;
  category: CategoryRelation;
  stock: number;
  seller_id: string;
  status: string;
};

type ProductStats = {
  likes: number;
  comments: number;
  liked: boolean;
};

function getCategoryName(
  category: CategoryRelation
): string {
  if (Array.isArray(category)) {
    return category[0]?.name || "";
  }

  return category?.name || "";
}

export default function ShopPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const { t, formatMoney } = useMoshiPreferences();

  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<
    Record<string, ProductStats>
  >({});

  const [images, setImages] = useState<
    Record<string, string[]>
  >({});

  const [imageIndexes, setImageIndexes] = useState<
    Record<string, number>
  >({});

  const [failedImages, setFailedImages] = useState<
    Record<string, boolean>
  >({});

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<{
    id: string;
  } | null>(null);

  const [liking, setLiking] = useState<string[]>([]);

  const loadProducts = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: auth,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      const { data, error } = await supabase
        .from("products")
        .select(
          `
            id,
            title,
            price,
            currency,
            images,
            stock,
            seller_id,
            status,
            category:categories(name)
          `
        )
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const user = auth.user;

      setCurrentUser(
        user ? { id: user.id } : null
      );

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
        likesResult,
        commentsResult,
        myLikesResult,
      ] = await Promise.all([
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
          : Promise.resolve({
              data: [],
              error: null,
            }),
      ]);

      if (likesResult.error) throw likesResult.error;
      if (commentsResult.error) throw commentsResult.error;
      if (myLikesResult.error) throw myLikesResult.error;

      const nextImages: Record<string, string[]> = {};

      for (const product of rows) {
        nextImages[product.id] =
          getProductImageUrls(product.images);
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
      console.error("Moshi shop:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

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
          current[productId].likes +
            (previous.liked ? -1 : 1)
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
        : await supabase
            .from("product_likes")
            .insert({
              product_id: productId,
              user_id: currentUser.id,
            });

      if (result.error) throw result.error;
    } catch (error) {
      console.error("Moshi product like:", error);

      setStats((current) => ({
        ...current,
        [productId]: previous,
      }));

      window.alert(
        t("Impossible de modifier le J'aime.")
      );
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

  const filtered = products.filter((product) => {
    const category = getCategoryName(product.category);

    return (
      product.title.toLowerCase().includes(query) ||
      category.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-[100dvh] bg-moshi-bg pb-28">
      <header className="sticky top-0 z-20 bg-white/95 shadow-sm backdrop-blur-md">
        <div className="px-3 pb-3 pt-4 sm:px-4">
          <div className="mb-3 flex items-center gap-3">
            <Link
              href="/"
              aria-label={t("Retour à l'accueil")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50 text-moshi-text"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <h1 className="flex-1 text-xl font-extrabold text-moshi-text">
              {t("Boutique")}
            </h1>

            <span className="text-xs text-gray-400 sm:text-sm">
              {products.length} {t("produit(s)")}
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder={t("Rechercher un produit...")}
              className="w-full rounded-2xl bg-gray-100 py-3 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#9D7BEA]/25 sm:py-4 sm:text-base"
            />
          </div>
        </div>
      </header>

      <main className="px-2 py-4 sm:px-4 sm:py-5">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-extrabold text-moshi-text sm:text-lg">
            {search
              ? t("Résultats de recherche")
              : t("Découvrir les produits")}
          </h2>

          <span className="text-[11px] text-gray-400 sm:text-xs">
            {filtered.length} {t("article(s)")}
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
                ? t("Aucun produit ne correspond à ta recherche.")
                : t("Aucun produit disponible pour le moment.")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {filtered.map((product) => {
              const itemStats = stats[product.id] || {
                likes: 0,
                comments: 0,
                liked: false,
              };

              const sources = images[product.id] || [];
              const index = imageIndexes[product.id] || 0;
              const imageUrl = sources[index];

              const noImage =
                !imageUrl || failedImages[product.id];

              const category = getCategoryName(
                product.category
              );

              return (
                <article
                  key={product.id}
                  className="min-w-0 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/[0.04] sm:rounded-2xl"
                >
                  <Link
                    href={`/shop/${product.id}`}
                    className="block"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-[#F1EFF6]">
                      {!noImage ? (
                        <Image
                          key={imageUrl}
                          src={imageUrl}
                          alt={product.title}
                          fill
                          sizes="(max-width: 640px) 33vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover"
                          unoptimized
                          onError={() =>
                            handleImageError(product.id)
                          }
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#C9C6D2]">
                          <Package
                            size={30}
                            strokeWidth={1.5}
                          />
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="p-2 sm:p-3">
                    <Link
                      href={`/shop/${product.id}`}
                      className="block"
                    >
                      <h3 className="line-clamp-2 min-h-[2rem] text-[11px] font-bold leading-4 text-moshi-text sm:min-h-10 sm:text-sm sm:leading-5">
                        {product.title}
                      </h3>

                      {category && (
                        <p className="mt-1 truncate text-[9px] text-gray-400 sm:text-xs">
                          {category}
                        </p>
                      )}

                      <p className="mt-2 break-words text-xs font-extrabold leading-4 text-[#9D7BEA] sm:text-base sm:leading-5">
                        {formatMoney(Number(product.price))}
                      </p>
                    </Link>

                    <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          void toggleLike(product.id)
                        }
                        disabled={liking.includes(product.id)}
                        aria-label={t("Aimer ce produit")}
                        className={`flex min-w-0 items-center gap-1 text-[10px] font-bold disabled:opacity-50 sm:gap-1.5 sm:text-sm ${
                          itemStats.liked
                            ? "text-[#D83D83]"
                            : "text-gray-500"
                        }`}
                      >
                        <Heart
                          className={`h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4 ${
                            itemStats.liked
                              ? "fill-current"
                              : ""
                          }`}
                        />

                        <span>{itemStats.likes}</span>
                      </button>

                      <Link
                        href={`/shop/${product.id}#comments`}
                        aria-label={t("Voir les commentaires")}
                        className="flex min-w-0 items-center gap-1 text-[10px] font-semibold text-gray-500 sm:gap-1.5 sm:text-sm"
                      >
                        <MessageCircle className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />

                        <span>{itemStats.comments}</span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

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
import { createClient } from "@/lib/supabase/client";
import {
  Package,
  Loader2,
  ArrowLeft,
  Search,
  Heart,
  MessageCircle,
} from "lucide-react";

interface Product {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
  category: string | null;
}

interface ProductStats {
  likes: number;
  comments: number;
  liked: boolean;
}

export default function ShopPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<
    Record<string, ProductStats>
  >({});
  const [imageSources, setImageSources] = useState<
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [liking, setLiking] = useState<string[]>([]);

  const loadProducts = useCallback(async () => {
    setLoading(true);

    try {
      const [
        { data: auth },
        { data, error },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("products")
          .select(
            "id,title,price,image_url,category"
          )
          .order("created_at", { ascending: false }),
      ]);

      if (error) throw error;

      const user = auth.user;
      setCurrentUser(user);

      const rows = data || [];
      setProducts(rows);

      if (!rows.length) {
        setStats({});
        setImageSources({});
        setImageIndexes({});
        setFailedImages({});
        return;
      }

      const productIds = rows.map((product) => product.id);

      // Récupération des images supplémentaires.
      const [
        { data: photoRows, error: photosError },
        { data: likeRows, error: likeError },
        { data: commentRows, error: commentError },
        { data: myLikes, error: myLikesError },
      ] = await Promise.all([
        supabase
          .from("product_images")
          .select("product_id,url,position")
          .in("product_id", productIds)
          .order("position", { ascending: true }),

        supabase
          .from("product_likes")
          .select("product_id")
          .in("product_id", productIds),

        supabase
          .from("product_comments")
          .select("product_id")
          .in("product_id", productIds),

        user
          ? supabase
              .from("product_likes")
              .select("product_id")
              .eq("user_id", user.id)
              .in("product_id", productIds)
          : Promise.resolve({
              data: [],
              error: null,
            }),
      ]);

      if (photosError) throw photosError;
      if (likeError) throw likeError;
      if (commentError) throw commentError;
      if (myLikesError) throw myLikesError;

      // Les URL déjà complètes sont conservées.
      // Les chemins de stockage sont convertis en URL publiques.
      const normalizeImageUrl = (value: string | null) => {
        if (!value) return null;

        const cleanValue = value.trim();

        if (!cleanValue) return null;

        if (
          cleanValue.startsWith("https://") ||
          cleanValue.startsWith("http://") ||
          cleanValue.startsWith("data:")
        ) {
          return cleanValue;
        }

        const cleanPath = cleanValue.replace(/^\/+/, "");

        return supabase.storage
          .from("products")
          .getPublicUrl(cleanPath).data.publicUrl;
      };

      const nextImageSources: Record<string, string[]> = {};

      for (const product of rows) {
        const additionalPhotos = (photoRows || [])
          .filter(
            (photo) => photo.product_id === product.id
          )
          .map((photo) => normalizeImageUrl(photo.url))
          .filter((url): url is string => Boolean(url));

        const mainPhoto = normalizeImageUrl(
          product.image_url
        );

        // Image principale en premier, puis les autres photos.
        nextImageSources[product.id] = [
          ...new Set(
            [
              mainPhoto,
              ...additionalPhotos,
            ].filter((url): url is string => Boolean(url))
          ),
        ];
      }

      setImageSources(nextImageSources);
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

      for (const row of likeRows || []) {
        if (nextStats[row.product_id]) {
          nextStats[row.product_id].likes += 1;
        }
      }

      for (const row of commentRows || []) {
        if (nextStats[row.product_id]) {
          nextStats[row.product_id].comments += 1;
        }
      }

      for (const row of myLikes || []) {
        if (nextStats[row.product_id]) {
          nextStats[row.product_id].liked = true;
        }
      }

      setStats(nextStats);
    } catch (error: any) {
      console.error(
        "Erreur chargement boutique :",
        error
      );
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

    const wasLiked = previous.liked;

    setLiking((items) => [...items, productId]);

    setStats((current) => ({
      ...current,
      [productId]: {
        ...current[productId],
        liked: !wasLiked,
        likes: Math.max(
          0,
          current[productId].likes +
            (wasLiked ? -1 : 1)
        ),
      },
    }));

    try {
      const result = wasLiked
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
    } catch (error: any) {
      setStats((current) => ({
        ...current,
        [productId]: previous,
      }));

      alert(
        "Impossible de modifier le J'aime : " +
          error.message
      );
    } finally {
      setLiking((items) =>
        items.filter((item) => item !== productId)
      );
    }
  };

  const handleImageError = (productId: string) => {
    const sources = imageSources[productId] || [];
    const currentIndex = imageIndexes[productId] || 0;

    if (currentIndex + 1 < sources.length) {
      setImageIndexes((current) => ({
        ...current,
        [productId]: currentIndex + 1,
      }));
    } else {
      setFailedImages((current) => ({
        ...current,
        [productId]: true,
      }));
    }
  };

  const filtered = products.filter((product) => {
    const query = search.toLowerCase().trim();

    return (
      product.title.toLowerCase().includes(query) ||
      (product.category || "")
        .toLowerCase()
        .includes(query)
    );
  });

  return (
    <div className="min-h-[100dvh] bg-moshi-bg pb-24">
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="p-1"
            aria-label="Retour"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>

          <h1 className="text-lg font-bold flex-1">
            Boutique
          </h1>

          <span className="text-xs text-gray-400">
            {products.length} produit(s)
          </span>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 text-sm outline-none focus:ring-2 focus:ring-moshi-purple/20"
            />
          </div>
        </div>
      </header>

      <div className="p-4 max-w-md mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-moshi-purple animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Package className="w-12 h-12 text-gray-300" />

            <p className="text-sm text-gray-500 text-center">
              {search
                ? "Aucun produit ne correspond à ta recherche."
                : "Aucun produit disponible."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((product) => {
              const productStats = stats[product.id] || {
                likes: 0,
                comments: 0,
                liked: false,
              };

              const sources =
                imageSources[product.id] || [];

              const imageIndex =
                imageIndexes[product.id] || 0;

              const currentImage =
                sources[imageIndex];

              const showPlaceholder =
                !currentImage ||
                failedImages[product.id];

              return (
                <article
                  key={product.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm min-w-0"
                >
                  <Link
                    href={`/shop/${product.id}`}
                    className="block"
                  >
                    <div className="aspect-square bg-gray-100 relative overflow-hidden">
                      {!showPlaceholder ? (
                        <Image
                          key={`${product.id}-${currentImage}`}
                          src={currentImage}
                          alt={product.title}
                          fill
                          sizes="(max-width: 768px) 50vw, 250px"
                          className="object-cover"
                          unoptimized
                          onError={() =>
                            handleImageError(product.id)
                          }
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Package size={40} />
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="p-3">
                    <Link href={`/shop/${product.id}`}>
                      <p className="text-sm font-bold truncate">
                        {product.title}
                      </p>

                      {product.category && (
                        <p className="text-[10px] text-gray-400 truncate">
                          {product.category}
                        </p>
                      )}

                      <p className="text-sm font-extrabold text-moshi-purple mt-1">
                        {Number(
                          product.price
                        ).toLocaleString("fr-FR")}{" "}
                        FCFA
                      </p>
                    </Link>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() =>
                          toggleLike(product.id)
                        }
                        disabled={liking.includes(
                          product.id
                        )}
                        aria-label={
                          productStats.liked
                            ? "Retirer mon J'aime"
                            : "Aimer ce produit"
                        }
                        className={`flex items-center gap-1 text-xs font-semibold disabled:opacity-50 ${
                          productStats.liked
                            ? "text-pink-600"
                            : "text-gray-500"
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            productStats.liked
                              ? "fill-current"
                              : ""
                          }`}
                        />
                        {productStats.likes}
                      </button>

                      <Link
                        href={`/shop/${product.id}#comments`}
                        className="flex items-center gap-1 text-xs text-gray-500 font-semibold"
                        aria-label={`${productStats.comments} commentaires`}
                      >
                        <MessageCircle className="w-4 h-4" />
                        {productStats.comments}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

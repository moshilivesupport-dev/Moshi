
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  ShoppingBag,
  Loader2,
  Package,
  Pencil,
  Trash2,
  Check,
  X,
  Heart,
  MessageCircle,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Send,
  Star,
} from "lucide-react";
import { getFlag } from "@/lib/utils";

const COMMENTS_PER_PAGE = 20;

type Product = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  stock: number;
  category: string | null;
  seller_id: string;
  currency?: string;
  seller_address?: string | null;
  seller_country?: string | null;
};

type SellerProfile = {
  username: string | null;
  full_name: string | null;
  country: string | null;
};

type ProductComment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  author?: string;
};

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [product, setProduct] = useState<Product | null>(null);
  const [sellerProfile, setSellerProfile] =
    useState<SellerProfile | null>(null);

  const [images, setImages] = useState<string[]>([]);
  const [activeImage, setActiveImage] = useState(0);

  const [comments, setComments] = useState<ProductComment[]>([]);
  const [replies, setReplies] = useState<
    Record<string, ProductComment[]>
  >({});
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [commentsPage, setCommentsPage] = useState(0);
  const [commentText, setCommentText] = useState("");

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const [editingCommentId, setEditingCommentId] =
    useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] =
    useState("");
  const [commentBusy, setCommentBusy] = useState(false);

  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);

  // Notes réelles enregistrées dans product_ratings
  const [ratingAverage, setRatingAverage] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editStock, setEditStock] = useState("");
  const [editImage, setEditImage] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const totalCommentPages = Math.ceil(
    commentsTotal / COMMENTS_PER_PAGE
  );

  const loadSocial = useCallback(
    async (userId?: string, page = 0) => {
      const from = page * COMMENTS_PER_PAGE;
      const to = from + COMMENTS_PER_PAGE - 1;

      const [
        { data: likeRows, error: likesError },
        { data: myLike, error: myLikeError },
        {
          data: commentRows,
          count: commentCount,
          error: commentsError,
        },
        {
          data: ratingRows,
          count: ratingsTotal,
          error: ratingsError,
        },
      ] = await Promise.all([
        supabase
          .from("product_likes")
          .select("id", { count: "exact" })
          .eq("product_id", id),

        userId
          ? supabase
              .from("product_likes")
              .select("id")
              .eq("product_id", id)
              .eq("user_id", userId)
              .maybeSingle()
          : Promise.resolve({
              data: null,
              error: null,
            }),

        supabase
          .from("product_comments")
          .select(
            "id,user_id,content,created_at,parent_id",
            { count: "exact" }
          )
          .eq("product_id", id)
          .is("parent_id", null)
          .order("created_at", { ascending: false })
          .range(from, to),

        supabase
          .from("product_ratings")
          .select("rating", { count: "exact" })
          .eq("product_id", id),
      ]);

      if (likesError) console.error(likesError);
      if (myLikeError) console.error(myLikeError);
      if (ratingsError) {
        console.error("Erreur chargement des avis :", ratingsError);
      }

      if (commentsError) {
        console.error(commentsError);
        return;
      }

      setLikes(likeRows?.length ?? 0);
      setLiked(!!myLike);
      setCommentsTotal(commentCount ?? 0);

      // Calcul de la moyenne à partir des notes réellement enregistrées.
      const validRatings = (ratingRows || [])
        .map((row: { rating: number }) => Number(row.rating))
        .filter(
          (rating: number) =>
            Number.isFinite(rating) &&
            rating >= 1 &&
            rating <= 5
        );

      const average = validRatings.length
        ? validRatings.reduce(
            (total: number, rating: number) => total + rating,
            0
          ) / validRatings.length
        : 0;

      setRatingAverage(average);
      setRatingCount(ratingsTotal ?? validRatings.length);

      const rows = commentRows || [];
      const parentIds = rows.map((row) => row.id);

      const replyRowsResult = parentIds.length
        ? await supabase
            .from("product_comments")
            .select(
              "id,user_id,content,created_at,parent_id"
            )
            .in("parent_id", parentIds)
            .order("created_at", { ascending: true })
        : { data: [], error: null };

      if (replyRowsResult.error) {
        console.error(replyRowsResult.error);
      }

      const replyRows = replyRowsResult.data || [];

      const userIds = [
        ...new Set([
          ...rows.map((row) => row.user_id),
          ...replyRows.map((row) => row.user_id),
        ]),
      ];

      const names: Record<string, string> = {};

      if (userIds.length) {
        const { data: profiles, error: profilesError } =
          await supabase
            .from("profiles")
            .select("id,username,full_name")
            .in("id", userIds);

        if (profilesError) console.error(profilesError);

        for (const profile of profiles || []) {
          names[profile.id] =
            profile.username ||
            profile.full_name ||
            "Membre Moshi";
        }
      }

      const formattedComments: ProductComment[] = rows.map(
        (row) => ({
          ...row,
          author: names[row.user_id] || "Membre Moshi",
        })
      );

      const groupedReplies: Record<
        string,
        ProductComment[]
      > = {};

      for (const reply of replyRows) {
        if (!reply.parent_id) continue;

        if (!groupedReplies[reply.parent_id]) {
          groupedReplies[reply.parent_id] = [];
        }

        groupedReplies[reply.parent_id].push({
          ...reply,
          author: names[reply.user_id] || "Membre Moshi",
        });
      }

      setComments(formattedComments);
      setReplies(groupedReplies);
    },
    [id, supabase]
  );

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);

      const [{ data: auth }, { data, error }] =
        await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from("products")
            .select("*")
            .eq("id", id)
            .maybeSingle(),
        ]);

      if (!alive) return;

      const user = auth.user;
      setCurrentUser(user);

      if (error || !data) {
        setProduct(null);
        setLoading(false);
        return;
      }

      setProduct(data);
      setIsOwner(user?.id === data.seller_id);

      setEditTitle(data.title);
      setEditDescription(data.description || "");
      setEditPrice(String(data.price));
      setEditStock(String(data.stock ?? 0));
      setEditImage(data.image_url);

      const [{ data: profile }, { data: photos }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("username,full_name,country")
            .eq("id", data.seller_id)
            .maybeSingle(),

          supabase
            .from("product_images")
            .select("url,position")
            .eq("product_id", id)
            .order("position", { ascending: true }),
        ]);

      if (!alive) return;

      setSellerProfile(profile);

      const urls = (photos || [])
        .map((photo) => photo.url)
        .filter(Boolean);

      const allImages = [
        ...new Set(
          [data.image_url, ...urls].filter(Boolean)
        ),
      ] as string[];

      setImages(allImages);

      await loadSocial(user?.id, 0);

      if (alive) setLoading(false);
    };

    if (id) void load();

    return () => {
      alive = false;
    };
  }, [id, supabase, loadSocial]);

  const changeCommentsPage = async (nextPage: number) => {
    if (
      nextPage < 0 ||
      nextPage >= totalCommentPages ||
      commentBusy
    ) {
      return;
    }

    setCommentsPage(nextPage);
    await loadSocial(currentUser?.id, nextPage);
  };

  const addToCart = async (goToCart = false) => {
    if (!currentUser) {
      router.push("/auth/login");
      return;
    }

    if (!product || product.stock < 1) return;

    setBusy(true);

    try {
      const { data: existing, error: findError } =
        await supabase
          .from("cart_items")
          .select("id,quantity")
          .eq("user_id", currentUser.id)
          .eq("product_id", product.id)
          .maybeSingle();

      if (findError) throw findError;

      const nextQuantity = Math.min(
        product.stock,
        (existing?.quantity || 0) + quantity
      );

      const result = existing
        ? await supabase
            .from("cart_items")
            .update({
              quantity: nextQuantity,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id)
        : await supabase.from("cart_items").insert({
            user_id: currentUser.id,
            product_id: product.id,
            quantity,
          });

      if (result.error) throw result.error;

      if (goToCart) {
        router.push("/cart?checkout=1");
      } else {
        alert("Produit ajouté au panier.");
      }
    } catch (error: any) {
      alert(
        "Impossible d'ajouter au panier : " +
          error.message
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleLike = async () => {
    if (!currentUser) {
      router.push("/auth/login");
      return;
    }

    const wasLiked = liked;

    setLiked(!wasLiked);
    setLikes((count) =>
      Math.max(0, count + (wasLiked ? -1 : 1))
    );

    const result = wasLiked
      ? await supabase
          .from("product_likes")
          .delete()
          .eq("product_id", id)
          .eq("user_id", currentUser.id)
      : await supabase
          .from("product_likes")
          .insert({
            product_id: id,
            user_id: currentUser.id,
          });

    if (result.error) {
      setLiked(wasLiked);
      setLikes((count) =>
        Math.max(0, count + (wasLiked ? 1 : -1))
      );
      alert(result.error.message);
    }
  };

  const submitComment = async () => {
    if (!currentUser) {
      router.push("/auth/login");
      return;
    }

    const content = commentText.trim();

    if (!content || content.length > 2000) return;

    setCommentBusy(true);

    const { error } = await supabase
      .from("product_comments")
      .insert({
        product_id: id,
        user_id: currentUser.id,
        content,
        parent_id: null,
      });

    if (error) {
      alert("Impossible de publier : " + error.message);
    } else {
      setCommentText("");
      setCommentsPage(0);
      await loadSocial(currentUser.id, 0);
    }

    setCommentBusy(false);
  };

  const submitReply = async (parentId: string) => {
    if (!currentUser) {
      router.push("/auth/login");
      return;
    }

    const content = replyText.trim();

    if (!content || content.length > 2000) return;

    setCommentBusy(true);

    const { error } = await supabase
      .from("product_comments")
      .insert({
        product_id: id,
        user_id: currentUser.id,
        parent_id: parentId,
        content,
      });

    if (error) {
      alert(
        "Impossible de publier la réponse : " + error.message
      );
    } else {
      setReplyText("");
      setReplyingTo(null);
      await loadSocial(currentUser.id, commentsPage);
    }

    setCommentBusy(false);
  };

  const startEditComment = (comment: ProductComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const saveEditedComment = async (commentId: string) => {
    const content = editingCommentText.trim();

    if (!content || content.length > 2000) {
      alert(
        "Le commentaire doit contenir entre 1 et 2 000 caractères."
      );
      return;
    }

    if (!currentUser) {
      router.push("/auth/login");
      return;
    }

    setCommentBusy(true);

    const { data, error } = await supabase
      .from("product_comments")
      .update({ content })
      .eq("id", commentId)
      .eq("user_id", currentUser.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      alert(
        error?.message ||
          "Modification impossible. Vérifie tes autorisations."
      );
    } else {
      setEditingCommentId(null);
      setEditingCommentText("");
      await loadSocial(currentUser.id, commentsPage);
    }

    setCommentBusy(false);
  };

  const deleteComment = async (commentId: string) => {
    if (
      !confirm(
        "Veux-tu vraiment supprimer ce commentaire ? Les réponses associées seront également supprimées."
      )
    ) {
      return;
    }

    if (!currentUser) {
      router.push("/auth/login");
      return;
    }

    setCommentBusy(true);

    const { error } = await supabase
      .from("product_comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", currentUser.id);

    if (error) {
      alert("Suppression impossible : " + error.message);
    } else {
      const nextTotal = Math.max(0, commentsTotal - 1);
      const nextPages = Math.ceil(
        nextTotal / COMMENTS_PER_PAGE
      );
      const nextPage = Math.min(
        commentsPage,
        Math.max(0, nextPages - 1)
      );

      setCommentsPage(nextPage);
      await loadSocial(currentUser.id, nextPage);
    }

    setCommentBusy(false);
  };

  const handleDelete = async () => {
    if (
      !confirm("Supprimer ce produit définitivement ?")
    ) {
      return;
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product?.id);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/shop");
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file || !currentUser) return;

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(
        file.type
      ) ||
      file.size > 10 * 1024 * 1024
    ) {
      alert(
        "Choisis une image JPG, PNG ou WebP de 10 Mo maximum."
      );
      return;
    }

    setUploading(true);

    try {
      const ext =
        file.name.split(".").pop()?.toLowerCase() || "jpg";

      const path = `${currentUser.id}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("products")
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from("products")
        .getPublicUrl(path);

      setEditImage(data.publicUrl);
    } catch (err: any) {
      alert("Erreur upload : " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (
      !editTitle.trim() ||
      !editDescription.trim() ||
      Number(editPrice) <= 0 ||
      Number(editStock) < 0
    ) {
      alert(
        "Vérifie le titre, la description, le prix et le stock."
      );
      return;
    }

    if (!currentUser || !product) return;

    setSaving(true);

    const { error } = await supabase
      .from("products")
      .update({
        title: editTitle.trim(),
        description: editDescription.trim(),
        price: Number(editPrice),
        stock: Number(editStock),
        image_url: editImage,
      })
      .eq("id", product.id)
      .eq("seller_id", currentUser.id);

    if (error) {
      alert("Erreur : " + error.message);
    } else {
      setProduct({
        ...product,
        title: editTitle.trim(),
        description: editDescription.trim(),
        price: Number(editPrice),
        stock: Number(editStock),
        image_url: editImage,
      });

      if (editImage) {
        setImages((prev) => [
          editImage,
          ...prev.filter((url) => url !== editImage),
        ]);
      }

      setIsEditing(false);
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-moshi-purple" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-3">
        <Package className="w-10 h-10 text-gray-300" />
        <p className="text-sm">Produit introuvable</p>
        <button
          onClick={() => router.push("/shop")}
          className="text-sm text-moshi-purple font-bold"
        >
          Retour à la boutique
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-moshi-bg pb-24 sm:pb-28">
      {/* En-tête */}
      <header className="absolute top-0 left-0 right-0 z-20 p-3 flex justify-between">
        <button
          onClick={() => router.back()}
          aria-label="Retour"
          className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {isOwner && !isEditing && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              aria-label="Modifier"
              className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-sm text-moshi-purple"
            >
              <Pencil className="w-4 h-4" />
            </button>

            <button
              onClick={handleDelete}
              aria-label="Supprimer"
              className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-sm text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      {/* Photos */}
      <div className="relative aspect-square w-full bg-white">
        {isEditing ? (
          editImage ? (
            <Image
              src={editImage}
              alt="Aperçu"
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <Package className="w-14 h-14 m-auto text-gray-300" />
          )
        ) : images.length ? (
          <Image
            src={images[activeImage] || images[0]}
            alt={product.title}
            fill
            className="object-contain"
            unoptimized
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <Package size={48} />
          </div>
        )}

        {!isEditing && images.length > 1 && (
          <>
            <button
              onClick={() =>
                setActiveImage(
                  (i) => (i - 1 + images.length) % images.length
                )
              }
              aria-label="Photo précédente"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={() =>
                setActiveImage(
                  (i) => (i + 1) % images.length
                )
              }
              aria-label="Photo suivante"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 shadow-sm"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 text-white text-[10px] px-2.5 py-1">
              {activeImage + 1}/{images.length}
            </span>
          </>
        )}

        {isEditing && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-3 right-3 bg-white px-3 py-2 rounded-full text-xs font-semibold shadow-sm"
          >
            {uploading ? "Envoi..." : "Changer la photo"}
          </button>
        )}

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          ref={fileInputRef}
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {!isEditing && images.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto px-3 py-2 bg-white">
          {images.map((src, i) => (
            <button
              key={src}
              onClick={() => setActiveImage(i)}
              className={`relative w-12 h-12 shrink-0 rounded-md overflow-hidden border ${
                activeImage === i
                  ? "border-moshi-purple"
                  : "border-transparent"
              }`}
            >
              <Image
                src={src}
                alt={`Photo ${i + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}

      <main className="px-3 py-3 sm:px-5 sm:py-4 space-y-4 sm:space-y-5">
        {isEditing ? (
          <section className="space-y-2.5">
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Nom du produit"
              className="w-full px-3 py-2.5 rounded-lg bg-white border text-sm font-bold"
            />

            <textarea
              value={editDescription}
              onChange={(e) =>
                setEditDescription(e.target.value)
              }
              rows={4}
              placeholder="Description obligatoire"
              className="w-full px-3 py-2.5 rounded-lg bg-white border text-sm"
            />

            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-white border text-sm"
                placeholder="Prix"
              />

              <input
                type="number"
                min="0"
                value={editStock}
                onChange={(e) => setEditStock(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-white border text-sm"
                placeholder="Stock"
              />
            </div>
          </section>
        ) : (
          <>
            {product.category && (
              <p className="text-[10px] sm:text-xs font-bold text-moshi-purple uppercase tracking-wider">
                {product.category}
              </p>
            )}

            {/* Nom, prix et avis */}
            <div className="space-y-1.5">
              <h1 className="text-lg sm:text-xl font-extrabold leading-snug text-moshi-text">
                {product.title}
              </h1>

              <p className="text-xl sm:text-2xl font-extrabold text-moshi-purple">
                {product.price.toLocaleString("fr-FR")}{" "}
                {product.currency === "XOF" || !product.currency
                  ? "FCFA"
                  : product.currency}
              </p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                <div
                  className="inline-flex items-center gap-1.5"
                  aria-label={`Note moyenne ${ratingAverage.toFixed(1)} sur 5`}
                >
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          ratingAverage >= star
                            ? "fill-amber-400 text-amber-400"
                            : ratingAverage >= star - 0.5
                              ? "fill-amber-200 text-amber-400"
                              : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>

                  <span className="text-xs font-bold text-gray-700">
                    {ratingCount > 0
                      ? ratingAverage.toFixed(1)
                      : "0,0"}
                  </span>

                  <span className="text-[11px] text-gray-400">
                    ({ratingCount} avis)
                  </span>
                </div>

                <span className="text-[11px] text-gray-500">
                  Stock : {product.stock}
                </span>
              </div>
            </div>

            {/* Likes et commentaires */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleLike}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  liked
                    ? "bg-pink-50 text-pink-600"
                    : "bg-white text-gray-600"
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${
                    liked ? "fill-current" : ""
                  }`}
                />
                {likes} J'aime
              </button>

              <a
                href="#comments"
                className="inline-flex items-center gap-1.5 text-xs text-gray-500"
              >
                <MessageCircle className="w-4 h-4" />
                {commentsTotal} commentaire(s)
              </a>
            </div>

            {/* Description */}
            <section className="space-y-1.5">
              <h2 className="text-sm font-bold">Description</h2>
              <p className="text-xs sm:text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                {product.description || "Aucune description."}
              </p>
            </section>

            {/* Vendeur */}
            <section className="bg-white rounded-xl p-3 space-y-1.5">
              <h2 className="text-sm font-bold">
                Informations du vendeur
              </h2>

              <p className="text-xs sm:text-sm text-gray-600">
                {sellerProfile?.username ||
                  sellerProfile?.full_name ||
                  "Vendeur Moshi"}{" "}
                {sellerProfile?.country
                  ? getFlag(sellerProfile.country)
                  : ""}
              </p>

              {(product.seller_address ||
                product.seller_country) && (
                <p className="text-xs text-gray-600 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {[
                    product.seller_address,
                    product.seller_country,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </section>

            {/* Commentaires */}
            <section
              id="comments"
              className="space-y-2.5 scroll-mt-16"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm sm:text-base font-bold">
                  Commentaires ({commentsTotal})
                </h2>
                <span className="text-[10px] text-gray-400">
                  {COMMENTS_PER_PAGE} par page
                </span>
              </div>

              {currentUser && !isOwner && (
                <div className="bg-white rounded-xl p-2.5 space-y-2">
                  <textarea
                    value={commentText}
                    onChange={(e) =>
                      setCommentText(e.target.value)
                    }
                    maxLength={2000}
                    rows={2}
                    placeholder="Écris un commentaire..."
                    className="w-full resize-none outline-none text-xs sm:text-sm"
                  />

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-400">
                      {commentText.length}/2000
                    </span>

                    <button
                      onClick={submitComment}
                      disabled={
                        commentBusy || !commentText.trim()
                      }
                      className="moshi-gradient text-white px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {commentBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      Publier
                    </button>
                  </div>
                </div>
              )}

              {!currentUser && (
                <button
                  onClick={() => router.push("/auth/login")}
                  className="w-full bg-white rounded-lg p-2.5 text-xs text-moshi-purple font-semibold"
                >
                  Connecte-toi pour commenter
                </button>
              )}

              {comments.length === 0 ? (
                <p className="text-xs text-gray-500 bg-white rounded-lg p-3">
                  Aucun commentaire pour le moment.
                </p>
              ) : (
                comments.map((comment) => {
                  const isCommentAuthor =
                    currentUser?.id === comment.user_id;

                  const isEditingThisComment =
                    editingCommentId === comment.id;

                  const commentReplies =
                    replies[comment.id] || [];

                  return (
                    <article
                      key={comment.id}
                      className="bg-white rounded-lg p-2.5 space-y-2"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-[11px] font-bold">
                          {comment.author}
                          {isCommentAuthor && (
                            <span className="ml-1.5 text-moshi-purple font-normal">
                              Toi
                            </span>
                          )}
                        </p>

                        {isCommentAuthor &&
                          !isEditingThisComment && (
                            <div className="flex items-center gap-2.5 shrink-0">
                              <button
                                onClick={() =>
                                  startEditComment(comment)
                                }
                                disabled={commentBusy}
                                aria-label="Modifier mon commentaire"
                                className="text-[10px] text-moshi-purple font-semibold disabled:opacity-50"
                              >
                                Modifier
                              </button>

                              <button
                                onClick={() =>
                                  deleteComment(comment.id)
                                }
                                disabled={commentBusy}
                                aria-label="Supprimer mon commentaire"
                                className="text-[10px] text-red-500 font-semibold disabled:opacity-50"
                              >
                                Supprimer
                              </button>
                            </div>
                          )}
                      </div>

                      {isEditingThisComment ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingCommentText}
                            onChange={(e) =>
                              setEditingCommentText(
                                e.target.value
                              )
                            }
                            maxLength={2000}
                            rows={2}
                            className="w-full rounded-lg border p-2 text-xs resize-none outline-none focus:border-moshi-purple"
                          />

                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-gray-400">
                              {editingCommentText.length}/2000
                            </span>

                            <div className="flex gap-1.5">
                              <button
                                onClick={cancelEditComment}
                                disabled={commentBusy}
                                className="px-2.5 py-1.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold"
                              >
                                Annuler
                              </button>

                              <button
                                onClick={() =>
                                  saveEditedComment(comment.id)
                                }
                                disabled={
                                  commentBusy ||
                                  !editingCommentText.trim()
                                }
                                className="px-2.5 py-1.5 rounded-md moshi-gradient text-white text-[10px] font-bold disabled:opacity-50"
                              >
                                {commentBusy
                                  ? "Enregistrement..."
                                  : "Enregistrer"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs whitespace-pre-line break-words leading-relaxed">
                          {comment.content}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[9px] text-gray-400">
                          {new Date(
                            comment.created_at
                          ).toLocaleString("fr-FR")}
                        </p>

                        <span className="text-[10px] text-gray-400">
                          {commentReplies.length} réponse(s)
                        </span>
                      </div>

                      <div className="ml-1.5 border-l-2 border-moshi-purple/20 pl-2.5 space-y-2">
                        {commentReplies.map((reply) => {
                          const isReplyAuthor =
                            currentUser?.id === reply.user_id;

                          const isEditingThisReply =
                            editingCommentId === reply.id;

                          return (
                            <div
                              key={reply.id}
                              className="bg-gray-50 rounded-lg p-2 space-y-1.5"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <p className="text-[11px] font-bold">
                                  {reply.author}
                                  {isReplyAuthor && (
                                    <span className="ml-1.5 text-moshi-purple font-normal">
                                      Toi
                                    </span>
                                  )}
                                </p>

                                {isReplyAuthor &&
                                  !isEditingThisReply && (
                                    <div className="flex gap-2 shrink-0">
                                      <button
                                        onClick={() =>
                                          startEditComment(reply)
                                        }
                                        disabled={commentBusy}
                                        className="text-[10px] text-moshi-purple font-semibold"
                                      >
                                        Modifier
                                      </button>

                                      <button
                                        onClick={() =>
                                          deleteComment(reply.id)
                                        }
                                        disabled={commentBusy}
                                        className="text-[10px] text-red-500 font-semibold"
                                      >
                                        Supprimer
                                      </button>
                                    </div>
                                  )}
                              </div>

                              {isEditingThisReply ? (
                                <div className="space-y-1.5">
                                  <textarea
                                    value={editingCommentText}
                                    onChange={(e) =>
                                      setEditingCommentText(
                                        e.target.value
                                      )
                                    }
                                    maxLength={2000}
                                    rows={2}
                                    className="w-full rounded-md border p-2 text-xs resize-none"
                                  />

                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={cancelEditComment}
                                      disabled={commentBusy}
                                      className="text-[10px] px-2.5 py-1.5 rounded-md bg-gray-200"
                                    >
                                      Annuler
                                    </button>

                                    <button
                                      onClick={() =>
                                        saveEditedComment(reply.id)
                                      }
                                      disabled={
                                        commentBusy ||
                                        !editingCommentText.trim()
                                      }
                                      className="text-[10px] px-2.5 py-1.5 rounded-md moshi-gradient text-white font-bold"
                                    >
                                      Enregistrer
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs whitespace-pre-line break-words leading-relaxed">
                                  {reply.content}
                                </p>
                              )}

                              <p className="text-[9px] text-gray-400">
                                {new Date(
                                  reply.created_at
                                ).toLocaleString("fr-FR")}
                              </p>
                            </div>
                          );
                        })}

                        {currentUser && (
                          <button
                            onClick={() => {
                              setReplyingTo(
                                replyingTo === comment.id
                                  ? null
                                  : comment.id
                              );
                              setReplyText("");
                            }}
                            disabled={commentBusy}
                            className="text-[11px] font-bold text-moshi-purple"
                          >
                            {replyingTo === comment.id
                              ? "Annuler"
                              : "Répondre"}
                          </button>
                        )}

                        {replyingTo === comment.id && (
                          <div className="space-y-1.5">
                            <textarea
                              value={replyText}
                              onChange={(e) =>
                                setReplyText(e.target.value)
                              }
                              maxLength={2000}
                              rows={2}
                              placeholder="Écris ta réponse..."
                              className="w-full rounded-lg border p-2 text-xs resize-none outline-none focus:border-moshi-purple"
                            />

                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-gray-400">
                                {replyText.length}/2000
                              </span>

                              <button
                                onClick={() =>
                                  submitReply(comment.id)
                                }
                                disabled={
                                  commentBusy ||
                                  !replyText.trim()
                                }
                                className="moshi-gradient text-white rounded-lg px-3 py-1.5 text-[10px] font-bold disabled:opacity-50 flex items-center gap-1.5"
                              >
                                {commentBusy ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3" />
                                )}
                                Publier
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })
              )}

              {totalCommentPages > 1 && (
                <div className="flex items-center justify-between bg-white rounded-lg p-2.5">
                  <button
                    onClick={() =>
                      changeCommentsPage(commentsPage - 1)
                    }
                    disabled={
                      commentsPage === 0 || commentBusy
                    }
                    className="flex items-center gap-1 text-xs font-semibold text-moshi-purple disabled:text-gray-300"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Précédent
                  </button>

                  <span className="text-[10px] text-gray-500">
                    Page {commentsPage + 1} / {totalCommentPages}
                  </span>

                  <button
                    onClick={() =>
                      changeCommentsPage(commentsPage + 1)
                    }
                    disabled={
                      commentsPage + 1 >= totalCommentPages ||
                      commentBusy
                    }
                    className="flex items-center gap-1 text-xs font-semibold text-moshi-purple disabled:text-gray-300"
                  >
                    Suivant
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Barre d'achat compacte */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-100 bg-white/95 backdrop-blur-sm px-2.5 pt-2 pb-[max(8px,env(safe-area-inset-bottom))]">
        {isEditing ? (
          <div className="flex gap-2 max-w-2xl mx-auto">
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 bg-gray-100 text-gray-600 font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5"
            >
              <X size={15} />
              Annuler
            </button>

            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="flex-1 moshi-gradient text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <>
                  <Check size={15} />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        ) : (
          !isOwner && (
            <div className="flex items-center gap-1.5 max-w-2xl mx-auto">
              {/* Quantité */}
              <div className="flex items-center justify-between border border-gray-200 rounded-lg h-10 shrink-0 w-[88px]">
                <button
                  onClick={() =>
                    setQuantity((n) => Math.max(1, n - 1))
                  }
                  className="px-2 h-full"
                  aria-label="Diminuer"
                >
                  <Minus size={13} />
                </button>

                <span className="min-w-4 text-center text-xs font-bold">
                  {quantity}
                </span>

                <button
                  onClick={() =>
                    setQuantity((n) =>
                      Math.min(product.stock, n + 1)
                    )
                  }
                  className="px-2 h-full"
                  aria-label="Augmenter"
                  disabled={quantity >= product.stock}
                >
                  <Plus size={13} />
                </button>
              </div>

              {/* Ajouter au panier */}
              <button
                onClick={() => addToCart(false)}
                disabled={busy || product.stock < 1}
                className="flex-1 min-w-0 h-10 bg-gray-100 text-moshi-purple font-bold text-[11px] sm:text-xs px-1.5 rounded-lg flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 size={14} className="animate-spin shrink-0" />
                ) : (
                  <>
                    <ShoppingBag size={14} className="shrink-0" />
                    <span className="truncate">
                      Ajouter au panier
                    </span>
                  </>
                )}
              </button>

              {/* Acheter */}
              <button
                onClick={() => addToCart(true)}
                disabled={busy || product.stock < 1}
                className="flex-1 min-w-0 h-10 moshi-gradient text-white font-bold text-[11px] sm:text-xs px-1.5 rounded-lg flex items-center justify-center disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <span className="truncate">
                    Acheter maintenant
                  </span>
                )}
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

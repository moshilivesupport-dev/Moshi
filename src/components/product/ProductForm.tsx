"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CURRENCIES } from "@/lib/currency";
import { X, ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";

const schema = z.object({
  title: z.string().min(3, "Titre trop court"),
  description: z.string().min(10, "Description trop courte"),
  price: z.coerce.number().positive("Prix invalide"),
  currency: z.string(),
  stock: z.coerce.number().min(0),
  category_id: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  sellerId: string;
  categories?: { id: string; name: string }[];
}

export function ProductForm({ sellerId, categories = [] }: Props) {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: "XOF", stock: 1 },
  });

  const canPublish = images.length >= 2;

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = [...images, ...files].slice(0, 8);
    setImages(newFiles);
    setPreviews(newFiles.map((f) => URL.createObjectURL(f)));
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const onSubmit = async (data: FormData) => {
    if (images.length < 2) {
      setError("Minimum 2 photos obligatoires pour publier.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: product, error: prodError } = await supabase
        .from("products")
        .insert({
          seller_id: sellerId,
          title: data.title,
          description: data.description,
          price: data.price,
          currency: data.currency,
          stock: data.stock,
          category_id: data.category_id || null,
        })
        .select()
        .single();

      if (prodError) throw prodError;

      // Upload images
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const path = `${sellerId}/${product.id}/${i}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("products")
          .upload(path, file);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("products").getPublicUrl(path);
        await supabase.from("product_images").insert({
          product_id: product.id,
          url: urlData.publicUrl,
          position: i,
        });
      }

      router.push(`/seller/products/${product.id}`);
    } catch (e: any) {
      setError(e.message || "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Input label="Titre du produit" {...register("title")} error={errors.title?.message} />
      <div>
        <label className="block text-sm font-medium text-muted mb-1.5">Description</label>
        <textarea
          {...register("description")}
          rows={4}
          className="input-field resize-none"
          placeholder="Décrivez votre produit..."
        />
        {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Prix" type="number" step="0.01" {...register("price")} error={errors.price?.message} />
        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">Devise</label>
          <select {...register("currency")} className="input-field">
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.code} – {c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <Input label="Stock" type="number" {...register("stock")} error={errors.stock?.message} />

      {categories.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-muted mb-1.5">Catégorie</label>
          <select {...register("category_id")} className="input-field">
            <option value="">Aucune</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Images – strict min 2 */}
      <div>
        <label className="block text-sm font-medium text-muted mb-2">
          Photos du produit <span className="text-coral">*</span>
          <span className="text-xs ml-2 text-muted">(minimum 2)</span>
        </label>
        <div className="grid grid-cols-4 gap-3">
          {previews.map((src, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-anthracite">
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {images.length < 8 && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-muted hover:border-coral hover:text-coral transition"
            >
              <ImagePlus className="w-6 h-6 mb-1" />
              <span className="text-xs">Ajouter</span>
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
        <p className={`text-xs mt-2 ${images.length < 2 ? "text-coral" : "text-green-400"}`}>
          {images.length}/2 photos minimum {images.length >= 2 ? "✓" : ""}
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        loading={loading}
        disabled={!canPublish}
        variant={canPublish ? "gold" : "outline"}
      >
        {canPublish ? "Publier le produit" : "Ajoutez au moins 2 photos"}
      </Button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Upload, Loader2, X } from "lucide-react";

export default function NewProductPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    stock: "1",
    currency: "EUR",
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      let imageUrl = null;

      // Upload image si présente
      if (file) {
        const fileName = `${user.id}/${Date.now()}.${file.name.split(".").pop()}`;
        const { error: upError } = await supabase.storage.from("products").upload(fileName, file);
        if (upError) throw upError;
        const { data: urlData } = supabase.storage.from("products").getPublicUrl(fileName);
        imageUrl = urlData.publicUrl;
      }

      // Insérer en base
      const { error } = await supabase.from("products").insert({
        seller_id: user.id,
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        currency: formData.currency,
        stock: parseInt(formData.stock),
        image_url: imageUrl,
        is_active: true,
        is_featured: false,
      });

      if (error) throw error;

      router.push("/seller");
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'ajout");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white p-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Ajouter un produit</h1>
        <button onClick={() => router.back()} className="p-2"><X className="w-6 h-6" /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Image */}
        <div>
          <label className="block text-sm text-neutral-400 mb-2">Photo du produit</label>
          <label className="border-2 border-dashed border-neutral-700 rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 transition overflow-hidden">
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <>
                <Upload className="w-10 h-10 text-neutral-500 mb-2" />
                <span className="text-sm text-neutral-500">Ajouter une photo</span>
              </>
            )}
            <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </label>
        </div>

        {/* Titre */}
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Titre du produit</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full bg-neutral-900 border border-neutral-700 p-3 rounded-lg text-white"
            placeholder="Ex: Robe en soie"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm text-neutral-400 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-neutral-900 border border-neutral-700 p-3 rounded-lg text-white h-24 resize-none"
            placeholder="Décris ton produit..."
          />
        </div>

        {/* Prix et stock */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Prix (€)</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-700 p-3 rounded-lg text-white"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Stock</label>
            <input
              type="number"
              required
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-700 p-3 rounded-lg text-white"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 mt-6"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Publier le produit"}
        </button>
      </form>
    </div>
  );
}
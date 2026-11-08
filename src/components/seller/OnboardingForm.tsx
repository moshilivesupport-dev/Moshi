"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import { Camera, Upload } from "lucide-react";

// Extension déduite du type MIME (jamais du nom de fichier)
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const schema = z.object({
  country: z.string().min(2, "Pays requis"),
  age: z.coerce.number().min(18, "Âge minimum 18 ans").max(120),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
});

type FormData = z.infer<typeof schema>;

const COUNTRIES = [
  "Togo", "France", "Sénégal", "Côte d'Ivoire", "Nigeria", "Ghana", "Kenya",
  "Cameroun", "Bénin", "Mali", "Burkina Faso", "Maroc", "Algérie", "Tunisie",
  "Canada", "USA", "UK", "Allemagne", "Espagne", "Portugal", "Chine", "Émirats"
];

export function OnboardingForm({ userId }: { userId: string }) {
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
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
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!EXT_BY_TYPE[file.type]) {
        setError("Format non pris en charge. Choisissez une photo JPG, PNG ou WebP.");
        e.target.value = "";
        return;
      }
      setError(null);
      setAvatarFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!avatarFile) {
      setError("La photo de profil est obligatoire pour activer le streaming.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Upload avatar
      const ext = EXT_BY_TYPE[avatarFile.type];
      if (!ext) throw new Error("Format non pris en charge (JPG, PNG ou WebP).");
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

      const { data: updated, error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: urlData.publicUrl,
          country: data.country,
          age: data.age,
          gender: data.gender,
          role: "seller",
          seller_status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select("seller_status")
        .single();

      if (updateError) throw updateError;
      // Approbation automatique : accès direct, sinon page d'attente
      router.push(updated?.seller_status === "approved" ? "/seller/live" : "/seller/pending");
    } catch (e: any) {
      setError(e.message || "Erreur lors de la soumission");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md mx-auto">
      <div className="text-center">
        <div
          onClick={() => fileRef.current?.click()}
          className="relative w-28 h-28 mx-auto rounded-full bg-anthracite border-2 border-dashed border-coral/50 flex items-center justify-center cursor-pointer overflow-hidden hover:border-coral transition"
        >
          {preview ? (
            <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center text-muted">
              <Camera className="w-8 h-8 mb-1" />
              <span className="text-xs">Photo</span>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
        <p className="text-xs text-muted mt-2">Photo de profil obligatoire *</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-muted mb-1.5">Pays</label>
        <select
          {...register("country")}
          className="input-field"
        >
          <option value="">Sélectionner un pays</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {errors.country && <p className="text-xs text-red-400 mt-1">{errors.country.message}</p>}
      </div>

      <Input
        label="Âge"
        type="number"
        {...register("age")}
        error={errors.age?.message}
        placeholder="25"
      />

      <div>
        <label className="block text-sm font-medium text-muted mb-1.5">Genre</label>
        <select {...register("gender")} className="input-field">
          <option value="">Sélectionner</option>
          <option value="male">Homme</option>
          <option value="female">Femme</option>
          <option value="other">Autre</option>
          <option value="prefer_not_to_say">Préfère ne pas dire</option>
        </select>
        {errors.gender && <p className="text-xs text-red-400 mt-1">{errors.gender.message}</p>}
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" loading={loading} variant="gold">
        Soumettre pour vérification
      </Button>
    </form>
  );
}

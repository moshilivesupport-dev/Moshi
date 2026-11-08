"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";

const schema = z.object({
  country: z.string().min(2, "Pays requis"),
  age: z.coerce.number().min(18, "Âge minimum 18 ans").max(120),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
});

type FormData = z.infer<typeof schema>;

const COUNTRIES = [
  "Togo", "France", "Sénégal", "Côte d'Ivoire", "Nigeria", "Ghana", "Kenya",
  "Cameroun", "Bénin", "Mali", "Burkina Faso", "Maroc", "Algérie", "Tunisie",
  "Canada", "USA", "UK", "Allemagne", "Espagne", "Portugal", "Chine", "Émirats",
];

/** Normalise n'importe quelle image vers un Blob non vide (évite "No content provided") */
async function toUploadableImage(
  file: File
): Promise<{ blob: Blob; contentType: string; ext: string }> {
  if (file.size === 0) {
    throw new Error("Fichier photo vide. Rechoisissez une image.");
  }

  // JPG / PNG / WebP déjà OK
  if (
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/webp"
  ) {
    const ext =
      file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const buffer = await file.arrayBuffer();
    if (buffer.byteLength === 0) {
      throw new Error("Photo illisible (0 octet). Essayez une autre image.");
    }
    const blob = new Blob([buffer], { type: file.type });
    return { blob, contentType: file.type, ext };
  }

  // HEIC / type vide / autres → conversion canvas → JPEG
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () =>
        reject(new Error("Impossible de lire la photo. Utilisez JPG ou PNG."));
      el.src = objectUrl;
    });

    const max = 1200;
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if (!w || !h) throw new Error("Dimensions de photo invalides.");

    if (w > max || h > max) {
      const ratio = Math.min(max / w, max / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponible sur cet appareil.");
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b && b.size > 0) resolve(b);
          else reject(new Error("Conversion de la photo échouée."));
        },
        "image/jpeg",
        0.85
      );
    });

    return { blob, contentType: "image/jpeg", ext: "jpg" };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

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
    if (!file) return;

    if (file.type && !file.type.startsWith("image/")) {
      setError("Choisissez une photo (JPG, PNG, WebP…).");
      e.target.value = "";
      return;
    }
    if (file.size === 0) {
      setError("Fichier photo vide. Réessayez.");
      e.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Photo trop lourde (max 10 Mo).");
      e.target.value = "";
      return;
    }

    setError(null);
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (data: FormData) => {
    if (!avatarFile) {
      setError("La photo de profil est obligatoire pour activer le streaming.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { blob, contentType, ext } = await toUploadableImage(avatarFile);
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, {
          upsert: true,
          contentType,
          cacheControl: "3600",
        });

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

      router.push(
        updated?.seller_status === "approved" ? "/seller/live" : "/seller/pending"
      );
      router.refresh();
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Erreur lors de la soumission";
      setError(message);
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
            // eslint-disable-next-line @next/next/no-img-element
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
        <select {...register("country")} className="input-field">
          <option value="">Sélectionner un pays</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {errors.country && (
          <p className="text-xs text-red-400 mt-1">{errors.country.message}</p>
        )}
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
        {errors.gender && (
          <p className="text-xs text-red-400 mt-1">{errors.gender.message}</p>
        )}
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
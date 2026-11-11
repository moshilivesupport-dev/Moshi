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
  age: z.coerce.number().min(18, "Age minimum 18 ans").max(120),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
});

type FormData = z.infer<typeof schema>;

const COUNTRIES = [
  "Togo",
  "France",
  "Senegal",
  "Cote d'Ivoire",
  "Nigeria",
  "Ghana",
  "Benin",
  "Mali",
  "Burkina Faso",
  "Maroc",
  "Cameroun",
  "Canada",
  "USA",
  "UK",
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
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Image uniquement.");
      return;
    }
    setAvatarFile(file);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(file);
    });
    e.target.value = "";
  };

  const onSubmit = async (data: FormData) => {
    if (!avatarFile) {
      setError("La photo de profil est obligatoire.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const path = `${userId}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, {
          upsert: true,
          contentType: avatarFile.type || "image/jpeg",
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: avatarUrl,
          country: data.country,
          age: data.age,
          gender: data.gender,
          role: "vendeur",
          seller_status: "approved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) throw updateError;

      router.push("/seller/live");
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
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6 max-w-md mx-auto"
    >
      <div className="text-center">
        <div
          onClick={() => fileRef.current?.click()}
          className="relative w-28 h-28 mx-auto rounded-full bg-neutral-900 border-2 border-dashed border-red-500/50 flex items-center justify-center cursor-pointer overflow-hidden hover:border-red-500 transition"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center text-neutral-500">
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
        <p className="text-xs text-neutral-500 mt-2">
          Photo de profil obligatoire *
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-400 mb-1.5">
          Pays
        </label>
        <select
          {...register("country")}
          className="w-full rounded-xl bg-neutral-900 border border-neutral-700 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
        >
          <option value="">Selectionner un pays</option>
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
        label="Age"
        type="number"
        {...register("age")}
        error={errors.age?.message}
        placeholder="25"
      />

      <div>
        <label className="block text-sm font-medium text-neutral-400 mb-1.5">
          Genre
        </label>
        <select
          {...register("gender")}
          className="w-full rounded-xl bg-neutral-900 border border-neutral-700 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
        >
          <option value="">Selectionner</option>
          <option value="male">Homme</option>
          <option value="female">Femme</option>
          <option value="other">Autre</option>
          <option value="prefer_not_to_say">Prefere ne pas dire</option>
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
        Devenir vendeur
      </Button>
    </form>
  );
}
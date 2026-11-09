"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import {
  Camera,
  Loader2,
  Store,
  ShoppingBag,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export type ProfileData = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: "acheteur" | "vendeur";
  created_at?: string;
};

interface ProfileViewProps {
  profile: ProfileData;
  isOwnProfile: boolean;
  stats?: {
    videos_count?: number;
    followers_count?: number;
    following_count?: number;
  };
}

export default function ProfileView({
  profile,
  isOwnProfile,
  stats = {},
}: ProfileViewProps) {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName =
    profile.full_name || profile.username || "Utilisateur";

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isOwnProfile) return;

    if (!file.type.startsWith("image/")) {
      setError("Fichier image uniquement.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image trop lourde (max 5 Mo).");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${profile.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      // Cache bust
      const urlWithTs = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlWithTs })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      setAvatarUrl(urlWithTs);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erreur lors de l'upload.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-black text-white min-h-[100dvh] pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral-800 border-2 border-neutral-700">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-neutral-500">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {isOwnProfile && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center border-2 border-black"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Camera className="w-4 h-4 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </>
            )}
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-xl font-bold truncate">{displayName}</h1>
            {profile.username && (
              <p className="text-neutral-400 text-sm">@{profile.username}</p>
            )}

            <div className="flex items-center gap-1.5 mt-2">
              {profile.role === "vendeur" ? (
                <span className="inline-flex items-center gap-1 text-xs bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full">
                  <Store className="w-3 h-3" />
                  Vendeur
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full">
                  <ShoppingBag className="w-3 h-3" />
                  Acheteur
                </span>
              )}
            </div>
          </div>

          {isOwnProfile && (
            <Link
              href="/profil/edit"
              className="p-2 rounded-full hover:bg-neutral-800 transition"
            >
              <Settings className="w-5 h-5 text-neutral-400" />
            </Link>
          )}
        </div>

        {profile.bio && (
          <p className="mt-4 text-sm text-neutral-300 leading-relaxed">
            {profile.bio}
          </p>
        )}

        {/* Stats */}
        <div className="flex gap-6 mt-5">
          <div className="text-center">
            <p className="font-bold text-lg">
              {formatNumber(stats.videos_count || 0)}
            </p>
            <p className="text-xs text-neutral-500">Vidéos</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">
              {formatNumber(stats.followers_count || 0)}
            </p>
            <p className="text-xs text-neutral-500">Abonnés</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg">
              {formatNumber(stats.following_count || 0)}
            </p>
            <p className="text-xs text-neutral-500">Abonnements</p>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {isOwnProfile && (
          <div className="mt-5 flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Upload..." : "Changer la photo"}
            </Button>
            <Link href="/profil/edit" className="flex-1">
              <Button variant="outline" className="w-full">
                Modifier le profil
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Séparateur */}
      <div className="h-px bg-neutral-800" />

      {/* Contenu (vidéos de l'utilisateur) – à enrichir plus tard */}
      <div className="px-4 py-6">
        <p className="text-sm text-neutral-500 text-center">
          Les vidéos de {isOwnProfile ? "vous" : displayName} apparaîtront ici.
        </p>
      </div>
    </div>
  );
}


"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  Camera,
  ArrowLeft,
  Loader2,
  Globe,
  Link as LinkIcon,
  ChevronRight
} from "lucide-react";

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("Togo");
  const [linkUrl, setLinkUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      setUserId(user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select(`
          username,
          full_name,
          bio,
          avatar_url,
          country,
          link_url,
          instagram_url,
          tiktok_url,
          youtube_url,
          facebook_url
        `)
        .eq("id", user.id)
        .single();

      if (error) {
        alert("Impossible de charger le profil : " + error.message);
      } else if (data) {
        setUsername(data.username || "");
        setFullName(data.full_name || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url);
        setCountry(data.country || "Togo");
        setLinkUrl(data.link_url || "");
        setInstagramUrl(data.instagram_url || "");
        setTiktokUrl(data.tiktok_url || "");
        setYoutubeUrl(data.youtube_url || "");
        setFacebookUrl(data.facebook_url || "");
      }

      setLoading(false);
    };

    loadProfile();
  }, [supabase, router]);

  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith("image/")) {
      alert("Choisis un fichier image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("La photo ne doit pas dépasser 5 Mo.");
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop() || "jpg";
      const filePath = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl + "?t=" + Date.now());
      alert("Photo de profil mise à jour.");
    } catch (err: any) {
      alert("Erreur photo : " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const normalizeUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const handleSave = async () => {
    if (!userId) return;

    if (!username.trim()) {
      alert("Le nom d'utilisateur est obligatoire.");
      return;
    }

    setSaving(true);

    const profileData = {
      username: username.trim().toLowerCase().replace(/\s/g, ""),
      full_name: fullName.trim(),
      bio: bio.slice(0, 150),
      link_url: normalizeUrl(linkUrl),
      instagram_url: normalizeUrl(instagramUrl),
      tiktok_url: normalizeUrl(tiktokUrl),
      youtube_url: normalizeUrl(youtubeUrl),
      facebook_url: normalizeUrl(facebookUrl),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from("profiles")
      .update(profileData)
      .eq("id", userId);

    if (error) {
      alert("Erreur lors de l'enregistrement : " + error.message);
    } else {
      alert("Profil mis à jour !");
      router.push(`/profile/${userId}`);
      router.refresh();
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-moshi-bg">
        <Loader2 className="w-10 h-10 text-moshi-purple animate-spin" />
      </div>
    );
  }

  const inputClass =
    "w-full mt-1 px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium";

  const labelClass = "text-xs font-bold text-gray-500 ml-1";

  return (
    <div className="min-h-[100dvh] bg-moshi-bg pb-10">
      <header className="px-4 py-4 flex items-center justify-between bg-white shadow-sm sticky top-0 z-20">
        <button onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-6 h-6 text-moshi-text" />
        </button>

        <h1 className="text-lg font-bold text-moshi-text">
          Modifier le profil
        </h1>

        <button
          onClick={handleSave}
          disabled={saving || uploading}
          className="text-sm font-bold text-moshi-purple disabled:opacity-50"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </header>

      <div className="p-6 flex flex-col items-center gap-6 max-w-md mx-auto mt-4">
        <div className="relative">
          <div className="w-28 h-28 rounded-full p-[3px] bg-gradient-to-br from-[#FF8FB1] via-[#9D7BEA] to-[#60A5FA]">
            <div className="w-full h-full rounded-full overflow-hidden border-4 border-white bg-gray-100 relative">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Avatar"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-moshi-purple">
                  {username.charAt(0).toUpperCase()}
                </div>
              )}

              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center text-moshi-purple"
          >
            <Camera size={18} />
          </button>

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>

        <div className="w-full space-y-5">
          <div>
            <label className={labelClass}>Nom complet</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
              placeholder="Ex : Moshi Shop"
            />
          </div>

          <div>
            <label className={labelClass}>Nom d'utilisateur (@)</label>
            <input
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))
              }
              className={inputClass}
              placeholder="Ex : moshishop"
            />
          </div>

          <div>
            <div className="flex justify-between items-center">
              <label className={labelClass}>Bio</label>
              <span className="text-xs text-gray-400">
                {bio.length}/150
              </span>
            </div>

            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 150))}
              rows={3}
              maxLength={150}
              className={`${inputClass} resize-none`}
              placeholder="Parle un peu de toi..."
            />
          </div>

          <div>
            <label className={labelClass}>Pays actuel</label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={country}
                readOnly
                className={`${inputClass} pl-11 bg-gray-100 text-gray-500 cursor-not-allowed`}
              />
            </div>

            <button
              type="button"
              onClick={() => router.push("/support/report-problem?type=country")}
              className="w-full mt-3 p-4 rounded-xl bg-white border border-gray-200 flex items-center justify-between text-left"
            >
              <div>
                <p className="text-sm font-bold text-moshi-purple">
                  Demander un changement de pays
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Une demande sera examinée par l’équipe Moshi.
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div>
            <label className={labelClass}>Lien personnel</label>
            <div className="relative">
              <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className={`${inputClass} pl-11`}
                placeholder="https://monsite.com"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200">
            <h2 className="font-bold text-sm text-moshi-text mb-1">
              Réseaux sociaux
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Ajoute tes comptes pour permettre aux visiteurs de te retrouver.
            </p>

            <div className="space-y-3">
              <div>
                <label className={labelClass}>Instagram</label>
                <input
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  className={inputClass}
                  placeholder="https://instagram.com/toncompte"
                />
              </div>

              <div>
                <label className={labelClass}>TikTok</label>
                <input
                  value={tiktokUrl}
                  onChange={(e) => setTiktokUrl(e.target.value)}
                  className={inputClass}
                  placeholder="https://tiktok.com/@toncompte"
                />
              </div>

              <div>
                <label className={labelClass}>YouTube</label>
                <input
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className={inputClass}
                  placeholder="https://youtube.com/@toncompte"
                />
              </div>

              <div>
                <label className={labelClass}>Facebook</label>
                <input
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  className={inputClass}
                  placeholder="https://facebook.com/toncompte"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="w-full py-3 rounded-xl bg-moshi-purple text-white font-bold text-sm disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </div>
      </div>
    </div>
  );
}

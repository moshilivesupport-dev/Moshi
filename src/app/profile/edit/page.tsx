
"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  Camera,
  ArrowLeft,
  Loader2,
  Globe,
  Link as LinkIcon,
  UserRound,
  Instagram,
  Video,
  Youtube,
  Facebook,
  Save,
  CheckCircle2,
} from "lucide-react";

const COUNTRIES = [
  "Togo",
  "Bénin",
  "Côte d'Ivoire",
  "Ghana",
  "Burkina Faso",
  "Sénégal",
  "Mali",
  "Niger",
  "Nigeria",
  "Cameroun",
  "Gabon",
  "Congo",
  "République démocratique du Congo",
  "Guinée",
  "Guinée-Bissau",
  "Liberia",
  "Sierra Leone",
  "Gambie",
  "Mauritanie",
  "France",
  "Belgique",
  "Canada",
  "États-Unis",
  "Royaume-Uni",
  "Allemagne",
  "Espagne",
  "Portugal",
  "Maroc",
  "Algérie",
  "Tunisie",
  "Afrique du Sud",
];

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
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          router.replace("/auth/login");
          return;
        }

        if (!active) return;
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

        if (error) throw error;
        if (!active) return;

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
      } catch (error) {
        console.error("Chargement du profil :", error);
        if (active) {
          alert("Impossible de charger les informations du profil.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [supabase, router]);

  async function handleAvatarUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file || !userId) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("Choisis une image JPG, PNG ou WebP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("La photo ne doit pas dépasser 5 Mo.");
      return;
    }

    setUploading(true);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${userId}/avatar.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      setSuccess("Photo de profil mise à jour.");
    } catch (error) {
      console.error("Erreur photo :", error);
      alert(
        error instanceof Error
          ? error.message
          : "Impossible de modifier la photo."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function normalizeUrl(value: string): string | null {
    const trimmed = value.trim();

    if (!trimmed) return null;

    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    return `https://${trimmed}`;
  }

  async function handleSave() {
    if (!userId || saving || uploading) return;

    const normalizedUsername = username
      .trim()
      .toLowerCase()
      .replace(/\s/g, "");

    if (!normalizedUsername || normalizedUsername.length < 3) {
      alert("Le nom d'utilisateur doit contenir au moins 3 caractères.");
      return;
    }

    if (!country.trim()) {
      alert("Choisis ton pays.");
      return;
    }

    if (bio.length > 150) {
      alert("La biographie ne doit pas dépasser 150 caractères.");
      return;
    }

    setSaving(true);
    setSuccess("");

    try {
      const profileData = {
        username: normalizedUsername,
        full_name: fullName.trim(),
        bio: bio.trim().slice(0, 150),
        country,
        link_url: normalizeUrl(linkUrl),
        instagram_url: normalizeUrl(instagramUrl),
        tiktok_url: normalizeUrl(tiktokUrl),
        youtube_url: normalizeUrl(youtubeUrl),
        facebook_url: normalizeUrl(facebookUrl),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update(profileData)
        .eq("id", userId);

      if (error) throw error;

      setSuccess("Ton profil a été mis à jour.");
      router.replace(`/profile/${userId}`);
      router.refresh();
    } catch (error) {
      console.error("Erreur sauvegarde profil :", error);
      alert(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer les modifications."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    router.push(userId ? `/profile/${userId}` : "/");
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 outline-none transition focus:border-moshi-purple focus:ring-2 focus:ring-moshi-purple/10";

  const labelClass = "text-sm font-semibold text-gray-700";

  if (loading) {
    return (
      <main className="fixed inset-0 z-[100] flex h-[100dvh] items-center justify-center overflow-y-auto bg-moshi-bg">
        <Loader2 className="h-8 w-8 animate-spin text-moshi-purple" />
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-[100] h-[100dvh] overflow-y-auto overscroll-contain bg-moshi-bg pb-10">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Retour au profil"
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5 text-moshi-text" />
        </button>

        <h1 className="text-base font-bold text-moshi-text">
          Modifier le profil
        </h1>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || uploading}
          className="flex items-center gap-2 rounded-xl bg-moshi-purple px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Enregistrer
        </button>
      </header>

      <div className="mx-auto max-w-xl space-y-4 px-4 py-5">
        {success && (
          <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {success}
          </div>
        )}

        <section className="flex flex-col items-center rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="relative">
            <div className="h-28 w-28 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-blue-400 p-[3px]">
              <div className="relative h-full w-full overflow-hidden rounded-full border-4 border-white bg-gray-100">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Photo de profil"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-moshi-purple">
                    {username.charAt(0).toUpperCase() || "M"}
                  </div>
                )}

                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="h-7 w-7 animate-spin text-white" />
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label="Changer la photo"
              className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-moshi-purple text-white shadow-md"
            >
              <Camera className="h-5 w-5" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          <p className="mt-3 text-sm font-bold text-gray-900">
            Photo de profil
          </p>
          <p className="mt-1 text-center text-xs text-gray-500">
            JPG, PNG ou WebP · 5 Mo maximum
          </p>
        </section>

        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-moshi-purple">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Identité</h2>
              <p className="text-xs text-gray-500">
                Les informations principales de ton profil
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelClass}>Nom d'utilisateur</label>
              <div className="relative">
                <span className="absolute left-4 top-[22px] text-sm font-bold text-gray-400">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) =>
                    setUsername(
                      event.target.value.toLowerCase().replace(/\s/g, "")
                    )
                  }
                  className={`${inputClass} pl-9`}
                  placeholder="moshi"
                  maxLength={30}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Nom complet</label>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className={inputClass}
                placeholder="Ton nom complet"
                maxLength={80}
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Biographie</h2>
          <p className="mt-1 text-xs text-gray-500">
            Présente-toi en quelques mots.
          </p>

          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value.slice(0, 150))}
            rows={4}
            maxLength={150}
            className={`${inputClass} resize-none`}
            placeholder="Parle un peu de toi..."
          />

          <div className="mt-2 text-right text-xs text-gray-400">
            {bio.length}/150
          </div>
        </section>

        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Pays</h2>
              <p className="text-xs text-gray-500">
                Pays associé à ton compte
              </p>
            </div>
          </div>

          <select
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            className={inputClass}
            aria-label="Choisir ton pays"
          >
            {!COUNTRIES.includes(country) && (
              <option value={country}>{country}</option>
            )}
            {COUNTRIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </section>

        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <LinkIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Lien personnel</h2>
              <p className="text-xs text-gray-500">
                Ton site ou ta page personnelle
              </p>
            </div>
          </div>

          <input
            type="text"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            className={inputClass}
            placeholder="https://monsite.com"
          />
        </section>

        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-gray-900">Réseaux sociaux</h2>
          <p className="mt-1 text-xs text-gray-500">
            Ajoute tes comptes pour permettre aux visiteurs de te retrouver.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Instagram className="h-4 w-4" />
                Instagram
              </label>
              <input
                type="text"
                value={instagramUrl}
                onChange={(event) => setInstagramUrl(event.target.value)}
                className={inputClass}
                placeholder="https://instagram.com/toncompte"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Video className="h-4 w-4" />
                TikTok
              </label>
              <input
                type="text"
                value={tiktokUrl}
                onChange={(event) => setTiktokUrl(event.target.value)}
                className={inputClass}
                placeholder="https://tiktok.com/@toncompte"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Youtube className="h-4 w-4" />
                YouTube
              </label>
              <input
                type="text"
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                className={inputClass}
                placeholder="https://youtube.com/@toncompte"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Facebook className="h-4 w-4" />
                Facebook
              </label>
              <input
                type="text"
                value={facebookUrl}
                onChange={(event) => setFacebookUrl(event.target.value)}
                className={inputClass}
                placeholder="https://facebook.com/toncompte"
              />
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || uploading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-moshi-purple py-4 text-sm font-bold text-white shadow-lg shadow-purple-900/10 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          {saving ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Link as LinkIcon, Copy, Check } from "lucide-react";

export default function EditProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUser(user);

      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setProfile(data);
        setUsername(data.username || "");
        setFullName(data.full_name || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url || "");
      }
    };
    load();
  }, [supabase, router]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username, full_name: fullName, bio, avatar_url: avatarUrl })
      .eq("id", user?.id);
    
    if (error) {
      alert("Erreur: " + error.message);
    } else {
      router.push(`/profile/${user?.id}`);
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner une image");
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("L'image est trop lourde (max 5MB)");
      return;
    }

    setUploadingAvatar(true);

    try {
      // Supprimer l'ancienne photo si elle existe
      if (avatarUrl) {
        const oldPath = avatarUrl.split("/").pop();
        if (oldPath) {
          await supabase.storage.from("avatars").remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload la nouvelle photo
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Récupérer l'URL publique
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      setAvatarUrl(data.publicUrl);

      // Mettre à jour dans la table profiles
      await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);

      alert("Photo de profil mise à jour !");
    } catch (err: any) {
      console.error(err);
      alert("Erreur upload: " + err.message);
    }

    setUploadingAvatar(false);
  };

  const copyProfileLink = () => {
    const url = `${window.location.origin}/profile/${user?.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!profile) return <div className="h-[100dvh] bg-black flex items-center justify-center text-white">Chargement...</div>;

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="p-2 hover:bg-neutral-800 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Modifier le profil</h1>
        <button onClick={handleSave} disabled={saving} className="text-red-500 font-semibold text-sm disabled:opacity-50">
          {saving ? "..." : "Enregistrer"}
        </button>
      </header>

      <div className="p-4 space-y-6">
        {/* Photo de profil */}
        <div className="flex flex-col items-center">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="relative w-28 h-28 rounded-full bg-neutral-800 overflow-hidden border-2 border-neutral-700 cursor-pointer group"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-neutral-500">
                {username?.charAt(0).toUpperCase() || "?"}
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
              <Camera className="w-8 h-8 text-white" />
            </div>
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="mt-3 text-cyan-400 font-semibold text-sm disabled:opacity-50"
          >
            {uploadingAvatar ? "Upload en cours..." : "Changer de photo"}
          </button>
        </div>

        {/* Nom */}
        <div className="bg-neutral-900 rounded-xl p-4">
          <label className="block text-sm text-neutral-400 mb-2">Nom</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-transparent text-white font-semibold outline-none"
            placeholder="Votre nom complet"
          />
        </div>

        {/* Username */}
        <div className="bg-neutral-900 rounded-xl p-4">
          <label className="block text-sm text-neutral-400 mb-2">Nom d'utilisateur</label>
          <div className="flex items-center gap-2">
            <span className="text-neutral-500">@</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
              className="flex-1 bg-transparent text-white font-semibold outline-none"
              placeholder="username"
            />
          </div>
        </div>

        {/* Lien du profil */}
        <button 
          onClick={copyProfileLink}
          className="w-full bg-neutral-900 rounded-xl p-4 flex items-center justify-between"
        >
          <div className="text-left">
            <p className="text-sm text-neutral-400">Lien du profil</p>
            <p className="text-sm text-white">moshi.app/@{username}</p>
          </div>
          {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-neutral-400" />}
        </button>

        {/* Bio */}
        <div className="bg-neutral-900 rounded-xl p-4">
          <label className="block text-sm text-neutral-400 mb-2">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={80}
            rows={3}
            className="w-full bg-transparent text-white text-sm outline-none resize-none"
            placeholder="Parlez de vous..."
          />
          <p className="text-xs text-neutral-500 text-right mt-1">{bio.length}/80</p>
        </div>

        {/* Liens */}
        <div className="bg-neutral-900 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-400">Liens</p>
            <p className="text-sm text-neutral-500">Ajoutez un lien vers votre site</p>
          </div>
          <LinkIcon className="w-5 h-5 text-neutral-400" />
        </div>
      </div>
    </div>
  );
}

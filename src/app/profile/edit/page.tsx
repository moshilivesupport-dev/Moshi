"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Camera, ArrowLeft, Loader2 } from "lucide-react";

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("username, full_name, bio, avatar_url")
        .eq("id", user.id)
        .single();

      if (data) {
        setUsername(data.username || "");
        setFullName(data.full_name || "");
        setBio(data.bio || "");
        setAvatarUrl(data.avatar_url);
      }
      setLoading(false);
    };
    loadProfile();
  }, [supabase, router]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/avatar.${fileExt}`;

      // 1. Upload dans le bucket "avatars"
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // 3. Mettre à jour l'état et la BDD
      setAvatarUrl(publicUrl + "?t=" + Date.now()); // Ajoute un timestamp pour éviter le cache
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
      
    } catch (err: any) {
      alert("Erreur upload : " + err.message + "\nVérifie que le bucket 'avatars' existe sur Supabase.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ username, full_name: fullName, bio })
      .eq("id", userId);

    if (error) {
      alert("Erreur : " + error.message);
    } else {
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

  return (
    <div className="min-h-[100dvh] bg-moshi-bg pb-10">
      {/* HEADER */}
      <header className="px-4 py-4 flex items-center justify-between bg-white shadow-sm sticky top-0 z-20">
        <button onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-6 h-6 text-moshi-text" />
        </button>
        <h1 className="text-lg font-bold text-moshi-text">Modifier le profil</h1>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="text-sm font-bold text-moshi-purple disabled:opacity-50"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </header>

      <div className="p-6 flex flex-col items-center gap-6 max-w-md mx-auto mt-4">
        
        {/* AVATAR */}
        <div className="relative">
          <div className="w-28 h-28 rounded-full p-[3px] bg-gradient-to-br from-[#FF8FB1] via-[#9D7BEA] to-[#60A5FA]">
            <div className="w-full h-full rounded-full overflow-hidden border-4 border-white bg-gray-100 relative">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Avatar" fill className="object-cover" unoptimized />
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

        {/* CHAMPS */}
        <div className="w-full space-y-4 mt-4">
          <div>
            <label className="text-xs font-bold text-gray-500 ml-1">Nom complet</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium"
              placeholder="Ex: Moshi Shop"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 ml-1">Nom d'utilisateur (@)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              className="w-full mt-1 px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium"
              placeholder="Ex: moshishop"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 ml-1">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full mt-1 px-4 py-3 rounded-xl bg-white border border-gray-200 focus:border-moshi-purple outline-none text-sm font-medium resize-none"
              placeholder="Parle un peu de toi..."
            />
          </div>
        </div>

      </div>
    </div>
  );
}

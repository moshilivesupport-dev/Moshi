"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Link as LinkIcon, Copy } from "lucide-react";

export default function EditProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
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
      }
    };
    load();
  }, [supabase, router]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username, full_name: fullName, bio })
      .eq("id", user.id);
    
    if (error) {
      alert("Erreur: " + error.message);
    } else {
      alert("Profil mis à jour !");
      router.push(`/profile/${user.id}`);
    }
    setSaving(false);
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
          <div className="relative w-24 h-24 rounded-full bg-neutral-800 overflow-hidden border-2 border-neutral-700">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold">
                {username?.charAt(0).toUpperCase() || "?"}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>
          <button className="mt-3 text-cyan-400 font-semibold text-sm">Changer de photo</button>
        </div>

        {/* Infos de base */}
        <div className="bg-neutral-900 rounded-xl overflow-hidden space-y-px">
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-neutral-400">Nom</p>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-transparent text-white font-semibold text-right outline-none w-48"
                placeholder="Votre nom"
              />
            </div>
          </div>
          <div className="h-px bg-neutral-800" />
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm text-neutral-400">Nom d'utilisateur</p>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-transparent text-white font-semibold text-right outline-none w-48"
                placeholder="@username"
              />
            </div>
          </div>
          <div className="h-px bg-neutral-800" />
          <button onClick={copyProfileLink} className="w-full flex items-center justify-between p-4">
            <div className="text-left">
              <p className="text-sm text-neutral-400">Lien du profil</p>
              <p className="text-sm text-white">moshi.app/@{username}</p>
            </div>
            {copied ? <span className="text-green-500 text-xs">Copié !</span> : <Copy className="w-4 h-4 text-neutral-400" />}
          </button>
        </div>

        {/* Bio */}
        <div className="bg-neutral-900 rounded-xl p-4">
          <p className="text-sm text-neutral-400 mb-2">Bio</p>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={80}
            rows={3}
            className="w-full bg-transparent text-white text-sm outline-none resize-none"
            placeholder="Parlez de vous..."
          />
          <p className="text-xs text-neutral-500 text-right">{bio.length}/80</p>
        </div>

        {/* Liens */}
        <div className="bg-neutral-900 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-400">Liens</p>
            <p className="text-sm text-neutral-500">Ajoutez un lien</p>
          </div>
          <LinkIcon className="w-5 h-5 text-neutral-400" />
        </div>
      </div>
    </div>
  );
}

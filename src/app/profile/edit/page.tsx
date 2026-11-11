"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/login?next=/profile/edit");
        return;
      }

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, username, bio")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || "");
        setUsername(profile.username || "");
        setBio(profile.bio || "");
      }

      setLoading(false);
    })();
  }, [router, supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setError(null);

    const cleanUsername = username
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9._]/g, "")
      .slice(0, 24);

    if (cleanUsername.length < 3) {
      setError("Nom d’utilisateur : 3 caractères minimum.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        username: cleanUsername,
        bio: bio.trim() || null,
      })
      .eq("id", userId);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push(`/profile/${userId}`);
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-black text-white flex items-center justify-center">
        Chargement...
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white px-4 pt-6 pb-28">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link
            href="/profile"
            className="p-2 rounded-full hover:bg-neutral-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold">Modifier le profil</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nom affiché"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Votre nom"
          />
          <Input
            label="Nom d’utilisateur"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ex. cosmeticslabss"
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-neutral-300">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={160}
              placeholder="Parlez un peu de vous..."
              className="w-full rounded-xl bg-neutral-900 border border-neutral-700 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
            />
            <p className="text-xs text-neutral-500 text-right">{bio.length}/160</p>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" loading={saving}>
            Enregistrer
          </Button>
        </form>
      </div>
    </div>
  );
}
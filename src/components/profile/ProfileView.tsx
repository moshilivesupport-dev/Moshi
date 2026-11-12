"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Play } from "lucide-react";
import { formatNumber } from "@/lib/utils";

// 1. On définit et on exporte le type ProfileData pour que page.tsx puisse l'utiliser
export type ProfileData = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string | null;
  created_at: string;
};

// 2. Le composant principal qui reçoit les bonnes données depuis page.tsx
export default function ProfileView({
  profile,
  isOwnProfile,
  stats,
}: {
  profile: ProfileData;
  isOwnProfile: boolean;
  stats: { videos_count: number; followers_count: number; following_count: number };
}) {
  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* En-tête du profil */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 rounded-full bg-neutral-800 mb-4 overflow-hidden border border-neutral-700">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-neutral-500">
              {profile.username?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>
        
        <h1 className="text-xl font-bold">{profile.full_name || profile.username}</h1>
        <p className="text-neutral-400 text-sm">@{profile.username}</p>
        
        <div className="flex gap-8 mt-6 text-center">
          <div>
            <span className="block font-bold text-lg">{stats.videos_count}</span>
            <span className="text-xs text-neutral-400">Vidéos</span>
          </div>
          <div>
            <span className="block font-bold text-lg">{formatNumber(stats.followers_count)}</span>
            <span className="text-xs text-neutral-400">Abonnés</span>
          </div>
          <div>
            <span className="block font-bold text-lg">{formatNumber(stats.following_count)}</span>
            <span className="text-xs text-neutral-400">Abonnements</span>
          </div>
        </div>

        {profile.bio && (
          <p className="mt-6 text-sm text-center max-w-md text-neutral-300">{profile.bio}</p>
        )}

        {isOwnProfile && (
          <button className="mt-6 px-6 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-full text-sm font-medium transition-colors">
            Modifier le profil
          </button>
        )}
      </div>

      {/* Grille des vidéos en dessous */}
      <ProfileVideoGrid userId={profile.id} />
    </div>
  );
}

// 3. Votre composant de grille de vidéos (inchangé, juste déplacé en dessous)
function ProfileVideoGrid({ userId }: { userId: string }) {
  const supabase = createClient();
  const [videos, setVideos] = useState<
    { id: string; url: string; view_count: number | null }[]
  >([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("videos")
        .select("id, url, view_count")
        .eq("user_id", userId)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(60);
      setVideos(data || []);
    })();
  }, [supabase, userId]);

  if (!videos.length) {
    return (
      <p className="text-sm text-neutral-500 text-center py-10">
        Aucune vidéo pour le moment
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-[1px] bg-neutral-900 rounded-lg overflow-hidden">
      {videos.map((v) => (
        <Link
          key={v.id}
          href={`/videos/${v.id}`}
          className="relative aspect-[3/4] bg-neutral-800 overflow-hidden group"
        >
          <video
            src={v.url}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
          />
          <div className="absolute bottom-1 left-1 flex items-center gap-0.5 text-white text-[10px] font-semibold drop-shadow">
            <Play className="w-3 h-3 fill-white" />
            {formatNumber(v.view_count || 0)}
          </div>
        </Link>
      ))}
    </div>
  );
}

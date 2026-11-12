"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Play, Grid3X3, Heart, Lock, Settings, Share2 } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import FollowButton from "@/components/social/FollowButton";

export type ProfileData = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string | null;
  created_at: string;
};

export default function ProfileView({
  profile,
  isOwnProfile,
  stats,
}: {
  profile: ProfileData;
  isOwnProfile: boolean;
  stats: { videos_count: number; followers_count: number; following_count: number };
}) {
  const [activeTab, setActiveTab] = useState<"videos" | "favorites">("videos");
  const [videos, setVideos] = useState<{ id: string; url: string; view_count: number | null }[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (activeTab === "videos") {
      (async () => {
        const { data } = await supabase
          .from("videos")
          .select("id, url, view_count")
          .eq("user_id", profile.id)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(60);
        setVideos(data || []);
      })();
    }
  }, [profile.id, activeTab, supabase]);

  const name = profile.full_name || profile.username || "Utilisateur";
  const handle = profile.username ? `@${profile.username}` : "";

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg hover:text-neutral-300 transition">
          {handle || "Profil"}
        </Link>
        <div className="flex items-center gap-2">
          {isOwnProfile && (
            <Link 
              href="/settings" 
              className="p-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-full transition active:scale-95"
              title="Paramètres"
            >
              <Settings className="w-5 h-5 text-white" />
            </Link>
          )}
          <button className="p-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-full transition active:scale-95">
            <Share2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </header>

      {/* Profil */}
      <div className="px-4 py-6 flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-neutral-800 overflow-hidden border-2 border-neutral-700 mb-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-neutral-500">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        <h1 className="text-xl font-bold">{name}</h1>
        {handle && <p className="text-sm text-neutral-400 mb-4">{handle}</p>}
        
        <div className="flex items-center gap-8 mb-4">
          <div className="text-center">
            <p className="text-lg font-bold">{stats.following_count || 0}</p>
            <p className="text-xs text-neutral-400">Abonnements</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{formatNumber(stats.followers_count || 0)}</p>
            <p className="text-xs text-neutral-400">Abonnés</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{formatNumber(stats.videos_count || 0)}</p>
            <p className="text-xs text-neutral-400">J'aime</p>
          </div>
        </div>

        {profile.bio && (
          <p className="text-sm text-center text-neutral-300 mb-6 max-w-xs whitespace-pre-wrap">{profile.bio}</p>
        )}

        {/* ✅ Boutons d'action avec FollowButton fonctionnel */}
        <div className="flex items-center gap-3 w-full max-w-xs">
          {isOwnProfile ? (
            <Link 
              href="/profile/edit" 
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white py-2.5 rounded-lg font-semibold text-sm text-center transition"
            >
              Modifier le profil
            </Link>
          ) : (
            <FollowButton 
              targetUserId={profile.id} 
              variant="profile" 
            />
          )}
          <button className="w-10 h-10 bg-neutral-800 hover:bg-neutral-700 rounded-lg flex items-center justify-center transition">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="sticky top-14 z-20 bg-black border-b border-neutral-800 flex">
        <button
          onClick={() => setActiveTab("videos")}
          className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-semibold transition border-b-2 ${
            activeTab === "videos" ? "text-white border-white" : "text-neutral-500 border-transparent hover:text-neutral-300"
          }`}
        >
          <Grid3X3 className="w-4 h-4" /> Vidéos
        </button>
        <button
          onClick={() => setActiveTab("favorites")}
          className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-semibold transition border-b-2 ${
            activeTab === "favorites" ? "text-white border-white" : "text-neutral-500 border-transparent hover:text-neutral-300"
          }`}
        >
          <Heart className="w-4 h-4" /> Favoris
        </button>
      </div>

      {/* Grille vidéos */}
      <div className="p-0.5">
        {activeTab === "videos" && (
          <>
            {videos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
                <Grid3X3 className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">Aucune vidéo publiée</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5">
                {videos.map((v) => (
                  <Link
                    key={v.id}
                    href={`/videos/${v.id}`}
                    className="relative aspect-[3/4] bg-neutral-900 group overflow-hidden"
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
            )}
          </>
        )}

        {activeTab === "favorites" && (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
            <Lock className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">Les vidéos favorites sont privées</p>
          </div>
        )}
      </div>
    </div>
  );
}

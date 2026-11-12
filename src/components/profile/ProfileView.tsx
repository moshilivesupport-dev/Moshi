"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Play, Grid3X3, Heart, Settings, Share2 } from "lucide-react";
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

interface ProfileViewProps {
  profile: ProfileData;
  isOwnProfile: boolean;
  initialStats: { videos_count: number; followers_count: number; following_count: number };
}

export default function ProfileView({ profile, isOwnProfile, initialStats }: ProfileViewProps) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"grid" | "private" | "favorites">("grid");
  const [videos, setVideos] = useState<any[]>([]);
  const [stats, setStats] = useState(initialStats);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      // ✅ VRAIES COLONNES
      const { data: videosData } = await supabase
        .from("videos")
        .select("id, url, view_count, like_count, caption, is_public")
        .eq("user_id", profile.id)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(60);
      
      setVideos(videosData || []);

      try {
        const [{ count: followers }, { count: following }] = await Promise.all([
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
        ]);
        setStats({
          videos_count: videosData?.length || 0,
          followers_count: followers || 0,
          following_count: following || 0,
        });
      } catch {}
    };
    loadData();
  }, [profile.id, refreshKey, supabase]);

  const handleFollowChange = () => setRefreshKey((k) => k + 1);

  const name = profile.full_name || profile.username || "Utilisateur";
  const handle = profile.username ? `@${profile.username}` : "";

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      <header className="sticky top-0 z-30 bg-black px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOwnProfile && (
            <Link href="/profile/edit" className="p-2">
              <Settings className="w-6 h-6 text-white" />
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2"><Share2 className="w-6 h-6 text-white" /></button>
        </div>
      </header>

      <div className="px-4 flex items-center gap-2">
        <h1 className="text-2xl font-bold">{name}</h1>
      </div>
      <p className="px-4 text-sm text-neutral-400 mb-4">{handle}</p>

      <div className="px-4 flex items-center gap-8 mb-4">
        <div className="text-center">
          <p className="text-xl font-bold">{stats.following_count || 0}</p>
          <p className="text-xs text-neutral-400">Suivis</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold">{formatNumber(stats.followers_count || 0)}</p>
          <p className="text-xs text-neutral-400">Followers</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold">{formatNumber(stats.videos_count || 0)}</p>
          <p className="text-xs text-neutral-400">Vidéos</p>
        </div>
      </div>

      {profile.bio && <p className="px-4 text-sm text-white mb-4 whitespace-pre-wrap">{profile.bio}</p>}

      {isOwnProfile ? (
        <div className="px-4 mb-4">
          <Link href="/profile/edit" className="flex items-center justify-center gap-2 border border-neutral-700 rounded-lg px-4 py-1.5 text-sm font-semibold">
            Modifier le profil
          </Link>
        </div>
      ) : (
        <div className="px-4 mb-4">
          <FollowButton targetUserId={profile.id} variant="profile" onFollowChange={handleFollowChange} />
        </div>
      )}

      <div className="border-b border-neutral-800 flex">
        <button onClick={() => setActiveTab("grid")} className={`flex-1 py-3 flex justify-center ${activeTab === "grid" ? "border-b-2 border-white" : ""}`}>
          <Grid3X3 className="w-5 h-5" />
        </button>
        <button onClick={() => setActiveTab("favorites")} className={`flex-1 py-3 flex justify-center ${activeTab === "favorites" ? "border-b-2 border-white" : ""}`}>
          <Heart className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-[1px]">
        {videos.map((v) => (
          <Link key={v.id} href={`/videos/${v.id}`} className="relative aspect-[3/4] bg-neutral-900">
            <video src={v.url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
            <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-xs font-semibold">
              <Play className="w-3 h-3 fill-white" />
              {formatNumber(v.view_count || 0)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
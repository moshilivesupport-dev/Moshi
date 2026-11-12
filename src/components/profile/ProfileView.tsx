"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { 
  Play, 
  Grid3X3, 
  Heart, 
  Lock, 
  RotateCcw, 
  Bookmark,
  Wallet,
  Plus,
  ChevronDown,
  Edit3,
  Calendar,
  UserPlus,
  Menu,
  Star
} from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      const { data: videosData } = await supabase
        .from("videos")
        .select("id, url, view_count, like_count, caption, is_pinned")
        .eq("user_id", profile.id)
        .eq("status", "published")
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
  }, [profile.id, refreshKey]);

  const handleFollowChange = () => setRefreshKey((k) => k + 1);

  const name = profile.full_name || profile.username || "Utilisateur";
  const handle = profile.username ? `@${profile.username}` : "";

  // Séparer vidéos épinglées et normales
  const pinnedVideos = videos.filter((v) => v.is_pinned);
  const normalVideos = videos.filter((v) => !v.is_pinned);

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      {/* Header style TikTok */}
      <header className="sticky top-0 z-30 bg-black px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOwnProfile && (
            <Link href="/profile/edit" className="p-2">
              <Edit3 className="w-6 h-6 text-white" />
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2"><Calendar className="w-6 h-6 text-white" /></button>
          <button className="p-2"><UserPlus className="w-6 h-6 text-white" /></button>
          <button onClick={() => setMenuOpen(true)} className="p-2">
            <Menu className="w-6 h-6 text-white" />
          </button>
        </div>
      </header>

      {/* Nom d'utilisateur avec dropdown */}
      <div className="px-4 flex items-center gap-2">
        <h1 className="text-2xl font-bold">{profile.username}</h1>
        <ChevronDown className="w-4 h-4 text-white" />
        <div className="w-2 h-2 rounded-full bg-red-500" />
      </div>
      <p className="px-4 text-sm text-neutral-400 mb-4">{handle}</p>

      {/* Stats */}
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
          <p className="text-xs text-neutral-400">J'aime</p>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="px-4 text-sm text-white mb-4 whitespace-pre-wrap">{profile.bio}</p>
      )}

      {/* Bouton Solde */}
      {isOwnProfile && (
        <div className="px-4 mb-4">
          <button className="flex items-center gap-2 border border-neutral-700 rounded-full px-4 py-1.5">
            <Wallet className="w-4 h-4 text-pink-500" />
            <span className="text-sm font-semibold">Solde</span>
          </button>
        </div>
      )}

      {/* Stories */}
      <div className="px-4 mb-4 flex gap-4">
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full border-2 border-neutral-700 flex items-center justify-center">
            <Plus className="w-8 h-8 text-white" />
          </div>
          <span className="text-xs">Nouveau</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full border-2 border-neutral-700 overflow-hidden">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg font-bold">{name.charAt(0).toUpperCase()}</div>
            )}
          </div>
          <span className="text-xs">Temps fort</span>
        </div>
      </div>

      {/* Onglets */}
      <div className="border-b border-neutral-800 flex">
        <button onClick={() => setActiveTab("grid")} className={`flex-1 py-3 flex justify-center ${activeTab === "grid" ? "border-b-2 border-white" : ""}`}>
          <Grid3X3 className="w-5 h-5" />
        </button>
        <button onClick={() => setActiveTab("private")} className={`flex-1 py-3 flex justify-center ${activeTab === "private" ? "border-b-2 border-white" : ""}`}>
          <Lock className="w-5 h-5" />
        </button>
        <button onClick={() => setActiveTab("favorites")} className={`flex-1 py-3 flex justify-center ${activeTab === "favorites" ? "border-b-2 border-white" : ""}`}>
          <Bookmark className="w-5 h-5" />
        </button>
      </div>

      {/* Playlists horizontales */}
      <div className="flex gap-3 overflow-x-auto px-4 py-3 border-b border-neutral-800">
        <button className="flex items-center gap-2 whitespace-nowrap">
          <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center">
            <Star className="w-3 h-3" />
          </div>
          <span className="text-sm">eva</span>
        </button>
        <button className="flex items-center gap-2 whitespace-nowrap">
          <Play className="w-4 h-4" />
          <span className="text-sm">Conte africain</span>
        </button>
        <button className="flex items-center gap-2 whitespace-nowrap">
          <Play className="w-4 h-4" />
          <span className="text-sm">K-Drama</span>
        </button>
      </div>

      {/* Grille vidéos */}
      <div className="grid grid-cols-3 gap-[1px]">
        {pinnedVideos.map((v) => (
          <Link key={v.id} href={`/videos/${v.id}`} className="relative aspect-[3/4] bg-neutral-900">
            <div className="absolute top-1 left-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
              Épinglé
            </div>
            <video src={v.url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
            <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-xs font-semibold">
              <Play className="w-3 h-3 fill-white" />
              {formatNumber(v.view_count || 0)}
            </div>
          </Link>
        ))}
        {normalVideos.map((v) => (
          <Link key={v.id} href={`/videos/${v.id}`} className="relative aspect-[3/4] bg-neutral-900">
            <video src={v.url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
            <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-xs font-semibold">
              <Play className="w-3 h-3 fill-white" />
              {formatNumber(v.view_count || 0)}
            </div>
          </Link>
        ))}
      </div>

      {/* Menu hamburger */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setMenuOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-neutral-900 p-6" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setMenuOpen(false)} className="absolute top-4 left-4">
              <Menu className="w-6 h-6" />
            </button>
            
            <h2 className="text-lg font-bold mb-6 mt-8">Ressources</h2>
            
            <Link href="/wallet" className="flex items-center justify-between py-3 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5" />
                <span>Solde</span>
              </div>
            </Link>

            <h3 className="text-sm text-neutral-400 mt-6 mb-3">Outils personnels</h3>
            <Link href="/activity" className="flex items-center justify-between py-3 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <span>🕐</span>
                <span>Centre des activités</span>
              </div>
            </Link>
            <Link href="/offline" className="flex items-center justify-between py-3 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <span>☁️</span>
                <span>Vidéos hors ligne</span>
              </div>
            </Link>
            <Link href="/qr" className="flex items-center justify-between py-3 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <span>🔲</span>
                <span>Ton code QR</span>
              </div>
            </Link>

            <h3 className="text-sm text-neutral-400 mt-6 mb-3">Outils de création et professionnels</h3>
            <Link href="/studio" className="flex items-center justify-between py-3 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5" />
                <span>TikTok Studio</span>
              </div>
            </Link>
            <Link href="/promote" className="flex items-center justify-between py-3 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <span>🔥</span>
                <span>Promouvoir</span>
              </div>
            </Link>

            <Link href="/settings" className="flex items-center justify-between py-3 mt-3">
              <div className="flex items-center gap-3">
                <span>⚙️</span>
                <span className="font-semibold">Paramètres et confidentialité</span>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

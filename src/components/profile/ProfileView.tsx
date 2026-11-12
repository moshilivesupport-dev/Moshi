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
  List
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
  const [activeTab, setActiveTab] = useState<"grid" | "private" | "reposts" | "favorites" | "liked">("grid");
  const [videos, setVideos] = useState<any[]>([]);
  const [likedVideos, setLikedVideos] = useState<any[]>([]);
  const [stats, setStats] = useState(initialStats);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountDropdown, setAccountDropdown] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      // Charger les vidéos publiées
      const { data: videosData } = await supabase
        .from("videos")
        .select("id, url, view_count, like_count, caption, is_pinned, user_id")
        .eq("user_id", profile.id)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(60);
      setVideos(videosData || []);

      // Charger les vidéos likées (pour l'onglet J'aime)
      if (activeTab === "liked") {
        const { data: likesData } = await supabase
          .from("video_likes")
          .select("video_id, videos(id, url, view_count, like_count, caption, user_id)")
          .eq("user_id", profile.id);
        
        const liked = likesData?.map((l: any) => l.videos).filter(Boolean) || [];
        setLikedVideos(liked);
      }

      // Stats followers/following
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
  }, [profile.id, activeTab, refreshKey]);

  const handleFollowChange = () => setRefreshKey((k) => k + 1);

  const name = profile.full_name || profile.username || "Utilisateur";
  const handle = profile.username ? `@${profile.username}` : "";

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

      {/* ✅ Nom d'utilisateur avec dropdown CLIQUABLE */}
      <div className="px-4 flex items-center gap-2 relative">
        <h1 className="text-2xl font-bold">{profile.username}</h1>
        <button 
          onClick={() => setAccountDropdown(!accountDropdown)}
          className="flex items-center gap-1 p-1"
        >
          <ChevronDown className="w-4 h-4 text-white" />
        </button>
        <div className="w-2 h-2 rounded-full bg-red-500" />
        
        {/* Menu dropdown des comptes */}
        {accountDropdown && isOwnProfile && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setAccountDropdown(false)} />
            <div className="absolute top-8 left-0 z-50 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl w-64 overflow-hidden">
              <div className="p-3 border-b border-neutral-800">
                <p className="text-xs text-neutral-400 mb-2">Compte actuel</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold">{name.charAt(0).toUpperCase()}</div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{profile.username}</p>
                    <p className="text-xs text-neutral-400">{handle}</p>
                  </div>
                </div>
              </div>
              <button className="w-full flex items-center gap-3 p-3 hover:bg-neutral-800 transition text-left">
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-neutral-600 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-neutral-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Ajouter un compte</p>
                  <p className="text-xs text-neutral-400">Créer ou connecter un autre compte</p>
                </div>
              </button>
              <button className="w-full flex items-center gap-3 p-3 hover:bg-neutral-800 transition text-left border-t border-neutral-800">
                <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-neutral-400" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Basculer vers</p>
                  <p className="text-xs text-neutral-400">Changer de compte</p>
                </div>
              </button>
            </div>
          </>
        )}
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
          <Link href="/wallet" className="inline-flex items-center gap-2 border border-neutral-700 rounded-full px-4 py-1.5 hover:bg-neutral-900 transition">
            <Wallet className="w-4 h-4 text-pink-500" />
            <span className="text-sm font-semibold">Solde</span>
          </Link>
        </div>
      )}

      {/* Stories */}
      <div className="px-4 mb-4 flex gap-4">
        <div className="flex flex-col items-center gap-2">
          <Link href="/stories/new" className="w-16 h-16 rounded-full border-2 border-neutral-700 flex items-center justify-center hover:border-neutral-500 transition">
            <Plus className="w-8 h-8 text-white" />
          </Link>
          <span className="text-xs">Nouveau</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Link href="/stories" className="w-16 h-16 rounded-full border-2 border-neutral-700 overflow-hidden hover:border-neutral-500 transition">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg font-bold">{name.charAt(0).toUpperCase()}</div>
            )}
          </Link>
          <span className="text-xs">Temps fort</span>
        </div>
      </div>

      {/* ✅ 5 ONGLETS COMPLETS style TikTok */}
      <div className="border-b border-neutral-800 flex">
        <button 
          onClick={() => setActiveTab("grid")} 
          className={`flex-1 py-3 flex justify-center ${activeTab === "grid" ? "border-b-2 border-white" : "text-neutral-500"}`}
          title="Vidéos"
        >
          <List className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setActiveTab("private")} 
          className={`flex-1 py-3 flex justify-center ${activeTab === "private" ? "border-b-2 border-white" : "text-neutral-500"}`}
          title="Privé"
        >
          <Lock className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setActiveTab("reposts")} 
          className={`flex-1 py-3 flex justify-center ${activeTab === "reposts" ? "border-b-2 border-white" : "text-neutral-500"}`}
          title="Reposts"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setActiveTab("favorites")} 
          className={`flex-1 py-3 flex justify-center ${activeTab === "favorites" ? "border-b-2 border-white" : "text-neutral-500"}`}
          title="Favoris"
        >
          <Bookmark className="w-5 h-5" />
        </button>
        <button 
          onClick={() => setActiveTab("liked")} 
          className={`flex-1 py-3 flex justify-center ${activeTab === "liked" ? "border-b-2 border-white" : "text-neutral-500"}`}
          title="J'aime"
        >
          <Heart className="w-5 h-5" />
        </button>
      </div>

      {/* Contenu des onglets */}
      <div className="grid grid-cols-3 gap-[1px]">
        {activeTab === "grid" && (
          <>
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
            {videos.length === 0 && (
              <div className="col-span-3 flex flex-col items-center justify-center py-16 text-neutral-500">
                <Grid3X3 className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">Aucune vidéo publiée</p>
              </div>
            )}
          </>
        )}

        {activeTab === "private" && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-neutral-500">
            <Lock className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">Vidéos privées</p>
            <p className="text-xs text-neutral-600 mt-1">Seul vous pouvez les voir</p>
          </div>
        )}

        {activeTab === "reposts" && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-neutral-500">
            <RotateCcw className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">Aucun repost</p>
            <p className="text-xs text-neutral-600 mt-1">Les vidéos repostées apparaîtront ici</p>
          </div>
        )}

        {activeTab === "favorites" && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-neutral-500">
            <Bookmark className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">Aucun favori</p>
            <p className="text-xs text-neutral-600 mt-1">Sauvegardez des vidéos pour les revoir</p>
          </div>
        )}

        {activeTab === "liked" && (
          <>
            {likedVideos.map((v: any) => (
              <Link key={v.id} href={`/videos/${v.id}`} className="relative aspect-[3/4] bg-neutral-900">
                <video src={v.url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-xs font-semibold">
                  <Play className="w-3 h-3 fill-white" />
                  {formatNumber(v.view_count || 0)}
                </div>
              </Link>
            ))}
            {likedVideos.length === 0 && (
              <div className="col-span-3 flex flex-col items-center justify-center py-16 text-neutral-500">
                <Heart className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">Aucune vidéo aimée</p>
                <p className="text-xs text-neutral-600 mt-1">Les vidéos que vous likez apparaîtront ici</p>
              </div>
            )}
          </>
        )}
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
                <span>MOSHI Studio</span>
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

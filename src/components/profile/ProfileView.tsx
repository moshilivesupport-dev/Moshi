"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Play, Grid3X3, Heart, Settings, Share2, Wallet,
  Lock, Repeat2, Bookmark, Plus, Image as ImageIcon
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
  const [stats, setStats] = useState(initialStats);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      const { data: videosData } = await supabase
        .from("videos")
        .select("id, url, view_count, like_count, caption, is_public, thumbnail_url")
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
  const totalLikes = videos.reduce((sum, v) => sum + (v.like_count || 0), 0);

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      {/* Header : boutons en haut */}
      <header className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOwnProfile && (
            <>
              <Link href="/profile/edit" className="p-2">
                <Settings className="w-6 h-6 text-white" />
              </Link>
              <Link href="/wallet" className="p-2">
                <Wallet className="w-6 h-6 text-white" />
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2">
            <Share2 className="w-6 h-6 text-white" />
          </button>
          <Link href="/settings" className="p-2">
            <div className="flex flex-col gap-1">
              <div className="w-5 h-0.5 bg-white rounded-full" />
              <div className="w-5 h-0.5 bg-white rounded-full" />
              <div className="w-5 h-0.5 bg-white rounded-full" />
            </div>
          </Link>
        </div>
      </header>

      {/* Avatar + Infos */}
      <div className="px-4 flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <h1 className="text-2xl font-bold">{name}</h1>
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 1l2.5 5 5.5.8-4 3.9.9 5.5L10 13.5 5.1 16.2l.9-5.5-4-3.9L7.5 6z"/>
            </svg>
          </div>
          <p className="text-sm text-neutral-400">{handle}</p>
        </div>

        {/* Avatar avec bordure style "Story non vue" */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full p-1 border-2 border-neutral-700">
            <div className="w-full h-full rounded-full overflow-hidden bg-neutral-800">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          {/* Bouton + si c'est mon profil */}
          {isOwnProfile && (
            <Link
              href="/profile/edit"
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-cyan-500 rounded-full flex items-center justify-center border-2 border-black"
            >
              <Plus className="w-4 h-4 text-white" strokeWidth={3} />
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 flex items-center gap-8 mb-4">
        <div className="text-center">
          <p className="text-lg font-bold">{formatNumber(stats.following_count || 0)}</p>
          <p className="text-xs text-neutral-400">Suivis</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{formatNumber(stats.followers_count || 0)}</p>
          <p className="text-xs text-neutral-400">Followers</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{formatNumber(totalLikes)}</p>
          <p className="text-xs text-neutral-400">J'aime</p>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="px-4 text-sm text-white mb-3 whitespace-pre-wrap leading-snug">
          {profile.bio}
        </p>
      )}

      {/* Badge Solde (visible seulement si c'est mon profil ou si admin) */}
      {(isOwnProfile || profile.role === "admin") && (
        <div className="px-4 mb-4 flex items-center gap-2">
          <Link
            href="/wallet"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-full text-sm font-semibold"
          >
            <Wallet className="w-4 h-4 text-pink-400" />
            Solde
          </Link>
        </div>
      )}

      {/* Boutons d'action (Suivre / Modifier / Message) */}
      <div className="px-4 mb-6">
        {isOwnProfile ? (
          <div className="flex gap-2">
            <Link
              href="/profile/edit"
              className="flex-1 flex items-center justify-center border border-neutral-700 rounded-lg px-4 py-2 text-sm font-semibold bg-neutral-900"
            >
              Modifier le profil
            </Link>
            <button className="px-4 py-2 border border-neutral-700 rounded-lg bg-neutral-900">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="flex-1">
              <FollowButton
                targetUserId={profile.id}
                variant="profile"
                onFollowChange={handleFollowChange}
              />
            </div>
            <Link
              href={`/messages?user=${profile.id}`}
              className="px-4 py-2 border border-neutral-700 rounded-lg bg-neutral-900 text-sm font-semibold"
            >
              Message
            </Link>
          </div>
        )}
      </div>

      {/* Boutons "Nouveau" et "Temps fort" (style Story) */}
      {isOwnProfile && (
        <div className="px-4 mb-6 flex gap-3 overflow-x-auto scrollbar-hide">
          <button className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-neutral-900 border-2 border-dashed border-neutral-700 flex items-center justify-center">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs text-white">Nouveau</span>
          </button>
          <button className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center overflow-hidden">
              <ImageIcon className="w-6 h-6 text-neutral-500" />
            </div>
            <span className="text-xs text-white">Temps fort</span>
          </button>
        </div>
      )}

      {/* Tabs de contenu */}
      <div className="border-b border-neutral-800 flex items-center justify-around">
        <button
          onClick={() => setActiveTab("grid")}
          className={`flex-1 py-3 flex justify-center ${activeTab === "grid" ? "border-b-2 border-white" : "text-neutral-500"}`}
        >
          <Grid3X3 className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab("private")}
          className={`flex-1 py-3 flex justify-center ${activeTab === "private" ? "border-b-2 border-white" : "text-neutral-500"}`}
        >
          <Lock className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab("reposts")}
          className={`flex-1 py-3 flex justify-center ${activeTab === "reposts" ? "border-b-2 border-white" : "text-neutral-500"}`}
        >
          <Repeat2 className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab("favorites")}
          className={`flex-1 py-3 flex justify-center ${activeTab === "favorites" ? "border-b-2 border-white" : "text-neutral-500"}`}
        >
          <Bookmark className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTab("liked")}
          className={`flex-1 py-3 flex justify-center ${activeTab === "liked" ? "border-b-2 border-white" : "text-neutral-500"}`}
        >
          <Heart className="w-5 h-5" />
        </button>
      </div>

      {/* Grille de vidéos */}
      {activeTab === "grid" && (
        <div className="grid grid-cols-3 gap-[1px]">
          {videos.map((v) => (
            <Link
              key={v.id}
              href={`/videos/${v.id}`}
              className="relative aspect-[9/16] bg-neutral-900"
            >
              {v.thumbnail_url ? (
                <img src={v.thumbnail_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <video
                  src={v.url}
                  muted
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-xs font-semibold drop-shadow-md">
                <Play className="w-3 h-3 fill-white" />
                {formatNumber(v.view_count || 0)}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Onglets vides pour l'instant */}
      {(activeTab === "private" || activeTab === "reposts" || activeTab === "favorites" || activeTab === "liked") && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Lock className="w-10 h-10 text-neutral-700" />
          <p className="text-neutral-500 text-sm">
            {activeTab === "private" && "Vidéos privées"}
            {activeTab === "reposts" && "Republications"}
            {activeTab === "favorites" && "Vidéos enregistrées"}
            {activeTab === "liked" && "Vidéos aimées"}
          </p>
        </div>
      )}

      {videos.length === 0 && activeTab === "grid" && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Play className="w-10 h-10 text-neutral-700" />
          <p className="text-neutral-500 text-sm">Aucune vidéo publiée</p>
          {isOwnProfile && (
            <Link
              href="/videos/new"
              className="text-red-500 font-semibold text-sm"
            >
              Publier ma première vidéo
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
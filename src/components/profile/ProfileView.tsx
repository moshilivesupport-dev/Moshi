"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Grid3X3,
  Play,
  Share2,
  Wallet,
  Lock,
  Bookmark,
  Heart,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ProfileData {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string | null;
}

interface Video {
  id: string;
  url: string;
  view_count: number;
  like_count: number;
  caption: string | null;
}

interface ProfileViewProps {
  profile: ProfileData;
  isOwnProfile: boolean;
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(".0", "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(".0", "") + "K";
  return num.toString();
}

export default function ProfileView({ profile, isOwnProfile }: ProfileViewProps) {
  const supabase = createClient();

  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    followers_count: 0,
    following_count: 0,
    total_likes: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // 1. Charger les vidéos de cet utilisateur
      const { data: videosData } = await supabase
        .from("videos")
        .select("id, url, view_count, like_count, caption")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(60);

      setVideos(videosData || []);

      // 2. Calculer le total de likes
      const totalLikes = (videosData || []).reduce(
        (sum, v) => sum + (v.like_count || 0),
        0
      );

      // 3. Charger les followers (si la table existe)
      try {
        const [{ count: followers }, { count: following }] = await Promise.all([
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
        ]);

        setStats({
          followers_count: followers || 0,
          following_count: following || 0,
          total_likes: totalLikes,
        });
      } catch (err) {
        // Si la table follows n'existe pas encore, on affiche 0
        setStats({ followers_count: 0, following_count: 0, total_likes: totalLikes });
      }

      setLoading(false);
    };

    loadData();
  }, [profile.id, supabase]);

  const handleDeleteVideo = async (videoId: string, videoUrl: string) => {
    if (!confirm("Supprimer cette vidéo définitivement ?")) return;

    try {
      // 1. Supprimer de la BDD
      const { error } = await supabase.from("videos").delete().eq("id", videoId);
      if (error) throw error;

      // 2. Retirer de la liste locale
      setVideos(videos.filter((v) => v.id !== videoId));
      setMenuOpenId(null);
    } catch (err) {
      alert("Erreur lors de la suppression.");
      console.error(err);
    }
  };

  const name = profile.full_name || profile.username || "Utilisateur";
  const handle = profile.username ? `@${profile.username}` : "";

  return (
    <div className="min-h-[100dvh] bg-moshi-bg text-moshi-text pb-24">
      
      {/* HEADER */}
      <header className="px-4 pt-6 pb-2 flex items-center justify-between">
        <Link href="/" className="text-sm font-medium text-moshi-purple">
          ← Retour
        </Link>
        <div className="flex gap-2">
          {isOwnProfile && (
            <Link href="/wallet" className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
              <Wallet className="w-5 h-5 text-moshi-purple" />
            </Link>
          )}
          <button className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
            <Share2 className="w-5 h-5 text-moshi-text" />
          </button>
        </div>
      </header>

      {/* INFOS PROFIL */}
      <div className="px-4 flex items-start justify-between mb-4 mt-2">
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-1">
            <h1 className="text-2xl font-bold">{name}</h1>
            <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">✓</span>
          </div>
          <p className="text-sm text-moshi-text/60">{handle}</p>
        </div>

        {/* Avatar */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-br from-[#FF8FB1] via-[#9D7BEA] to-[#60A5FA]">
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-white bg-gray-100">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt={name} width={80} height={80} className="w-full h-full object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-moshi-purple">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="px-4 flex items-center gap-8 mb-4">
        <div className="text-center">
          <p className="text-lg font-bold">{formatNumber(stats.following_count)}</p>
          <p className="text-xs text-moshi-text/60">Suivis</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{formatNumber(stats.followers_count)}</p>
          <p className="text-xs text-moshi-text/60">Followers</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{formatNumber(stats.total_likes)}</p>
          <p className="text-xs text-moshi-text/60">J'aime</p>
        </div>
      </div>

      {/* BIO */}
      {profile.bio && (
        <p className="px-4 text-sm whitespace-pre-wrap leading-snug mb-4">
          {profile.bio}
        </p>
      )}

      {/* BOUTON MODIFIER */}
      {isOwnProfile && (
        <div className="px-4 mb-4">
          <Link href="/profile/edit" className="flex items-center justify-center bg-white rounded-full py-2.5 text-sm font-semibold shadow-sm text-gray-800">
            Modifier le profil
          </Link>
        </div>
      )}

      {/* ONGLETS (Vidéos, Privé, Favoris, Likes) */}
      <div className="flex border-b border-gray-200">
        <button className="flex-1 py-3 flex justify-center border-b-2 border-moshi-purple">
          <Grid3X3 className="w-5 h-5 text-moshi-purple" />
        </button>
        <button className="flex-1 py-3 flex justify-center text-gray-400">
          <Lock className="w-5 h-5" />
        </button>
        <button className="flex-1 py-3 flex justify-center text-gray-400">
          <Bookmark className="w-5 h-5" />
        </button>
        <button className="flex-1 py-3 flex justify-center text-gray-400">
          <Heart className="w-5 h-5" />
        </button>
      </div>

      {/* GRILLE DE VIDÉOS */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-[#9D7BEA] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Play className="w-10 h-10 text-gray-300" />
          <p className="text-sm text-moshi-text/60">Aucune vidéo publiée</p>
          {isOwnProfile && (
            <Link href="/create">
              <button className="moshi-gradient text-white font-bold px-6 py-2.5 rounded-full text-sm">
                Publier ma première vidéo
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-[2px] p-1">
          {videos.map((video) => (
            <div key={video.id} className="relative aspect-[9/16] bg-gray-900 overflow-hidden rounded-lg">
              <Link href={`/videos/${video.id}`}>
                <video
                  src={`${video.url}#t=0.1`}
                  muted
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover"
                />
              </Link>

              {/* Vues */}
              <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-xs font-semibold drop-shadow-md pointer-events-none">
                <Play className="w-3 h-3 fill-white" />
                {formatNumber(video.view_count || 0)}
              </div>

              {/* Menu Options */}
              {isOwnProfile && (
                <div className="absolute top-1 right-1 z-20">
                  <button
                    onClick={() => setMenuOpenId(menuOpenId === video.id ? null : video.id)}
                    className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white"
                  >
                    <MoreVertical size={14} />
                  </button>

                  {menuOpenId === video.id && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setMenuOpenId(null)} />
                      <div className="absolute top-9 right-0 z-40 bg-white rounded-xl shadow-xl overflow-hidden min-w-[120px]">
                        <button
                          onClick={() => handleDeleteVideo(video.id, video.url)}
                          className="flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 w-full text-left text-xs font-semibold"
                        >
                          <Trash2 size={14} /> Supprimer
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
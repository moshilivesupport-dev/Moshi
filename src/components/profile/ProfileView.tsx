
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
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
  Video,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ProfileData {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface VideoData {
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
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(".0", "") + "M";
  }

  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(".0", "") + "K";
  }

  return num.toString();
}

export default function ProfileView({
  profile,
  isOwnProfile,
}: ProfileViewProps) {
  const supabase = createClient();
  const searchParams = useSearchParams();

  const returnToLiveId = searchParams.get("returnToLive");

  const returnHref = returnToLiveId
    ? `/live/${encodeURIComponent(returnToLiveId)}`
    : "/";

  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const [stats, setStats] = useState({
    followers_count: 0,
    following_count: 0,
    total_likes: 0,
  });

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);

      try {
        const { data: videosData, error: videosError } = await supabase
          .from("videos")
          .select("id, url, view_count, like_count, caption")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(60);

        if (videosError) throw videosError;

        const loadedVideos = videosData || [];

        if (cancelled) return;

        setVideos(loadedVideos);

        const totalLikes = loadedVideos.reduce(
          (sum, video) => sum + (video.like_count || 0),
          0
        );

        const [followersResult, followingResult] = await Promise.all([
          supabase
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("following_id", profile.id),

          supabase
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("follower_id", profile.id),
        ]);

        if (cancelled) return;

        setStats({
          followers_count: followersResult.count || 0,
          following_count: followingResult.count || 0,
          total_likes: totalLikes,
        });
      } catch (error) {
        console.error("Erreur chargement profil :", error);

        if (!cancelled) {
          setStats({
            followers_count: 0,
            following_count: 0,
            total_likes: 0,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [profile.id, supabase]);

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm("Supprimer cette vidéo définitivement ?")) return;

    try {
      const { error } = await supabase
        .from("videos")
        .delete()
        .eq("id", videoId);

      if (error) throw error;

      setVideos((current) =>
        current.filter((video) => video.id !== videoId)
      );

      setMenuOpenId(null);
    } catch (error) {
      console.error("Erreur suppression vidéo :", error);
      alert("Erreur lors de la suppression.");
    }
  };

  const name =
    profile.full_name || profile.username || "Utilisateur";

  const handle = profile.username
    ? `@${profile.username}`
    : "";

  const isVendeur = profile.role === "vendeur";

  return (
    <div className="min-h-[100dvh] bg-moshi-bg text-moshi-text pb-24">

      {/* HEADER */}
      <header className="px-4 pt-6 pb-2 flex items-center justify-between">
        <Link
          href={returnHref}
          className="flex items-center gap-2 text-sm font-semibold text-moshi-purple"
        >
          {returnToLiveId ? (
            <>
              <Video className="w-5 h-5" />
              Retour au live
            </>
          ) : (
            "← Retour"
          )}
        </Link>

        <div className="flex gap-2">
          {isOwnProfile && (
            <Link
              href="/wallet"
              className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center"
            >
              <Wallet className="w-5 h-5 text-moshi-purple" />
            </Link>
          )}

          <button
            type="button"
            aria-label="Partager le profil"
            className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center"
          >
            <Share2 className="w-5 h-5 text-moshi-text" />
          </button>
        </div>
      </header>

      {/* INFOS */}
      <div className="px-4 flex items-start justify-between mb-4 mt-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-2xl font-bold">{name}</h1>

            <span className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
              ✓
            </span>

            {isVendeur && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-[#FF8FB1] to-[#9D7BEA] text-white">
                Vendeur
              </span>
            )}
          </div>

          <p className="text-sm text-moshi-text/60">{handle}</p>
        </div>

        {/* AVATAR */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-br from-[#FF8FB1] via-[#9D7BEA] to-[#60A5FA]">
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-white bg-gray-100">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                  unoptimized
                />
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
          <p className="text-lg font-bold">
            {formatNumber(stats.following_count)}
          </p>
          <p className="text-xs text-moshi-text/60">Suivis</p>
        </div>

        <div className="text-center">
          <p className="text-lg font-bold">
            {formatNumber(stats.followers_count)}
          </p>
          <p className="text-xs text-moshi-text/60">Followers</p>
        </div>

        <div className="text-center">
          <p className="text-lg font-bold">
            {formatNumber(stats.total_likes)}
          </p>
          <p className="text-xs text-moshi-text/60">J'aime</p>
        </div>
      </div>

      {/* BIO */}
      {profile.bio && (
        <p className="px-4 text-sm whitespace-pre-wrap leading-snug mb-4">
          {profile.bio}
        </p>
      )}

      {/* MODIFIER PROFIL */}
      {isOwnProfile && (
        <div className="px-4 mb-4">
          <Link
            href="/profile/edit"
            className="flex items-center justify-center bg-white rounded-full py-2.5 text-sm font-semibold shadow-sm text-gray-800"
          >
            Modifier le profil
          </Link>
        </div>
      )}

      {/* ONGLETS */}
      <div className="flex border-b border-gray-200">
        <button
          type="button"
          aria-label="Vidéos"
          className="flex-1 py-3 flex justify-center border-b-2 border-moshi-purple"
        >
          <Grid3X3 className="w-5 h-5 text-moshi-purple" />
        </button>

        <button
          type="button"
          aria-label="Privé"
          className="flex-1 py-3 flex justify-center text-gray-400"
        >
          <Lock className="w-5 h-5" />
        </button>

        <button
          type="button"
          aria-label="Favoris"
          className="flex-1 py-3 flex justify-center text-gray-400"
        >
          <Bookmark className="w-5 h-5" />
        </button>

        <button
          type="button"
          aria-label="J'aime"
          className="flex-1 py-3 flex justify-center text-gray-400"
        >
          <Heart className="w-5 h-5" />
        </button>
      </div>

      {/* GRILLE VIDÉOS */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-[#9D7BEA] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Play className="w-10 h-10 text-gray-300" />

          <p className="text-sm text-moshi-text/60">
            Aucune vidéo publiée
          </p>

          {isOwnProfile && (
            <Link
              href="/create"
              className="moshi-gradient text-white font-bold px-6 py-2.5 rounded-full text-sm"
            >
              Publier ma première vidéo
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-[2px] p-1">
          {videos.map((video) => (
            <div
              key={video.id}
              className="relative aspect-[9/16] bg-gray-900 overflow-hidden rounded-lg"
            >
              <Link href={`/videos/${video.id}`}>
                <video
                  src={`${video.url}#t=0.1`}
                  muted
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover"
                />
              </Link>

              <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-xs font-semibold drop-shadow-md pointer-events-none">
                <Play className="w-3 h-3 fill-white" />
                {formatNumber(video.view_count || 0)}
              </div>

              {isOwnProfile && (
                <div className="absolute top-1 right-1 z-20">
                  <button
                    type="button"
                    onClick={() =>
                      setMenuOpenId(
                        menuOpenId === video.id ? null : video.id
                      )
                    }
                    aria-label="Options vidéo"
                    className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white"
                  >
                    <MoreVertical size={14} />
                  </button>

                  {menuOpenId === video.id && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setMenuOpenId(null)}
                      />

                      <div className="absolute top-9 right-0 z-40 bg-white rounded-xl shadow-xl overflow-hidden min-w-[120px]">
                        <button
                          type="button"
                          onClick={() => handleDeleteVideo(video.id)}
                          className="flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 w-full text-left text-xs font-semibold"
                        >
                          <Trash2 size={14} />
                          Supprimer
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

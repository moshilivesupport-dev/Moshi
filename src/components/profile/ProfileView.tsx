"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Play, Lock, RotateCcw, Bookmark, Heart,
  Wallet, Plus, Menu, X, Edit3, Calendar, UserPlus
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
  created_at?: string;
};

interface ProfileViewProps {
  profile: ProfileData;
  isOwnProfile: boolean;
  initialStats: { videos_count: number; followers_count: number; following_count: number };
}

type VideoItem = {
  id: string;
  url: string | null;
  view_count?: number | null;
  like_count?: number | null;
  caption?: string | null;
  status?: string | null;
};

export default function ProfileView({
  profile,
  isOwnProfile,
  initialStats,
}: ProfileViewProps) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"grid" | "private" | "reposts" | "favorites" | "liked">("grid");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [likedVideos, setLikedVideos] = useState<VideoItem[]>([]);
  const [savedVideos, setSavedVideos] = useState<VideoItem[]>([]);
  const [stats, setStats] = useState(initialStats);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // Vidéos publiées du profil (ajout is_public pour compatibilité)
      const { data: videosData, error: videosError } = await supabase
        .from("videos")
        .select("id, url, view_count, like_count, caption, user_id, status, is_public")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(60);

      if (videosError) {
        console.error("videos error:", videosError);
        setVideos([]);
      } else {
        const list = (videosData || []).filter(v => !v.status || v.status === "published");
        setVideos(list as VideoItem[]);
      }

      // Vidéos likées
      {
        const { data: likesData, error: likesError } = await supabase
          .from("video_likes")
          .select("video_id")
          .eq("user_id", profile.id);

        if (!likesError) {
          const ids = (likesData || []).map((l: any) => l.video_id).filter(Boolean);
          if (ids.length) {
            const { data: likedRows } = await supabase
              .from("videos")
              .select("id, url, view_count, like_count, caption, user_id")
              .in("id", ids);
            setLikedVideos((likedRows as VideoItem[]) || []);
          }
        }
      }

      // Vidéos enregistrées (favoris)
      {
        const { data: bmData, error: bmError } = await supabase
          .from("video_bookmarks")
          .select("video_id")
          .eq("user_id", profile.id);

        if (!bmError) {
          const ids = (bmData || []).map((b: any) => b.video_id).filter(Boolean);
          if (ids.length) {
            const { data: savedRows } = await supabase
              .from("videos")
              .select("id, url, view_count, like_count, caption, user_id")
              .in("id", ids);
            setSavedVideos((savedRows as VideoItem[]) || []);
          }
        }
      }

      // Stats
      try {
        const [{ count: followers }, { count: following }] = await Promise.all([
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
        ]);
        const published = (videosData || []).filter(v => !v.status || v.status === "published").length;
        setStats({
          videos_count: published,
          followers_count: followers || 0,
          following_count: following || 0,
        });
      } catch {}

      setLoading(false);
    };

    void loadData();
  }, [profile.id, supabase]);

  const name = profile.full_name || profile.username || "Utilisateur";
  const handle = profile.username ? `@${profile.username}` : "";

  const VideoGrid = ({ items }: { items: VideoItem[] }) => (
    <>
      {items.map((v) => (
        <Link key={v.id} href={`/videos/${v.id}`} className="relative aspect-[3/4] bg-neutral-900">
          {v.url ? (
            <video src={v.url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
          ) : <div className="w-full h-full bg-neutral-800" />}
          <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-xs font-semibold drop-shadow">
            <Play className="w-3 h-3 fill-white" />
            {formatNumber(v.view_count || 0)}
          </div>
        </Link>
      ))}
    </>
  );

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <Link href="/profile/edit" className="p-2"><Edit3 className="w-5 h-5" /></Link>
        <div className="flex items-center gap-3">
          <Link href="/calendar" className="p-2"><Calendar className="w-5 h-5" /></Link>
          <Link href="/profile/find-friends" className="p-2"><UserPlus className="w-5 h-5" /></Link>
          <button type="button" onClick={() => setMenuOpen(true)} className="p-2"><Menu className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="px-4 mt-2">
        <h1 className="text-xl font-bold">{profile.username || name}</h1>
        {handle && <p className="text-sm text-neutral-400">{handle}</p>}
      </div>

      {/* Stats */}
      <div className="flex gap-8 px-4 mt-5">
        <div><p className="text-lg font-bold">{formatNumber(stats.following_count)}</p><p className="text-xs text-neutral-400">Suivis</p></div>
        <div><p className="text-lg font-bold">{formatNumber(stats.followers_count)}</p><p className="text-xs text-neutral-400">Followers</p></div>
        <div><p className="text-lg font-bold">{formatNumber(likedVideos.length)}</p><p className="text-xs text-neutral-400">J&apos;aime</p></div>
      </div>

      {profile.bio && <p className="px-4 mt-3 text-sm text-neutral-300">{profile.bio}</p>}

      {isOwnProfile && (
        <div className="px-4 mt-4">
          <Link href="/wallet" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-700 text-sm">
            <Wallet className="w-4 h-4 text-pink-400" /> Solde
          </Link>
        </div>
      )}

      {/* Stories */}
      <div className="flex gap-4 px-4 mt-5 overflow-x-auto">
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="w-16 h-16 rounded-full border border-neutral-600 flex items-center justify-center"><Plus className="w-6 h-6" /></div>
          <span className="text-xs">Nouveau</span>
        </div>
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="w-16 h-16 rounded-full border border-neutral-600 overflow-hidden bg-neutral-800">
            {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : null}
          </div>
          <span className="text-xs">Temps fort</span>
        </div>
      </div>

      {!isOwnProfile && <div className="px-4 mt-4"><FollowButton targetUserId={profile.id} variant="profile" /></div>}

      {/* Onglets */}
      <div className="border-b border-neutral-800 flex mt-4">
        {([["grid", List], ["private", Lock], ["reposts", RotateCcw], ["favorites", Bookmark], ["liked", Heart]] as const).map(([key, Icon]) => (
          <button key={key} type="button" onClick={() => setActiveTab(key)} className={`flex-1 py-3 flex justify-center ${activeTab === key ? "border-b-2 border-white text-white" : "text-neutral-500"}`}>
            <Icon className="w-5 h-5" />
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="grid grid-cols-3 gap-[1px] min-h-[200px]">
        {loading && <div className="col-span-3 py-16 text-center text-neutral-500">Chargement...</div>}

        {!loading && activeTab === "grid" && (
          <>
            <VideoGrid items={videos} />
            {videos.length === 0 && <div className="col-span-3 flex flex-col items-center justify-center py-16 text-neutral-500"><List className="w-12 h-12 mb-3 opacity-50" /><p>Aucune vidéo</p></div>}
          </>
        )}

        {!loading && (activeTab === "private" || activeTab === "reposts") && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-neutral-500">
            <Lock className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">Aucun contenu</p>
          </div>
        )}

        {!loading && activeTab === "favorites" && (
          <>
            <VideoGrid items={savedVideos} />
            {savedVideos.length === 0 && <div className="col-span-3 flex flex-col items-center justify-center py-16 text-neutral-500"><Bookmark className="w-12 h-12 mb-3 opacity-50" /><p>Aucun favori</p></div>}
          </>
        )}

        {!loading && activeTab === "liked" && (
          <>
            <VideoGrid items={likedVideos} />
            {likedVideos.length === 0 && <div className="col-span-3 flex flex-col items-center justify-center py-16 text-neutral-500"><Heart className="w-12 h-12 mb-3 opacity-50" /><p>Aucune vidéo aimée</p></div>}
          </>
        )}
      </div>

      {/* Menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setMenuOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-neutral-900 p-6" onClick={e => e.stopPropagation()}>
            <button onClick={() => setMenuOpen(false)}><X className="w-6 h-6" /></button>
            <div className="mt-8 space-y-4">
              <Link href="/settings" className="block">Paramètres</Link>
              <Link href="/wallet" className="block">Portefeuille</Link>
              <Link href="/profile/edit" className="block">Modifier le profil</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
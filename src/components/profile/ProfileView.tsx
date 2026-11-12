"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Play,
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
  List,
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
  initialStats: {
    videos_count: number;
    followers_count: number;
    following_count: number;
  };
}

type VideoItem = {
  id: string;
  url: string | null;
  view_count?: number | null;
  like_count?: number | null;
  caption?: string | null;
  user_id?: string;
};

export default function ProfileView({
  profile,
  isOwnProfile,
  initialStats,
}: ProfileViewProps) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<
    "grid" | "private" | "reposts" | "favorites" | "liked"
  >("grid");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [likedVideos, setLikedVideos] = useState<VideoItem[]>([]);
  const [savedVideos, setSavedVideos] = useState<VideoItem[]>([]);
  const [stats, setStats] = useState(initialStats);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountDropdown, setAccountDropdown] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // 1) Vidéos publiées du profil
      // Pas de is_pinned (colonne pas forcément présente)
      let videosQuery = supabase
        .from("videos")
        .select("id, url, view_count, like_count, caption, user_id, status")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(60);

      const { data: videosData, error: videosError } = await videosQuery;

      if (videosError) {
        console.error("videos error:", videosError);
        setVideos([]);
      } else {
        // Accepte published OU status null (anciennes lignes)
        const list = (videosData || []).filter(
          (v) => !v.status || v.status === "published"
        );
        setVideos(list as VideoItem[]);
      }

      // 2) Vidéos likées
      if (activeTab === "liked" || isOwnProfile) {
        const { data: likesData, error: likesError } = await supabase
          .from("video_likes")
          .select("video_id")
          .eq("user_id", profile.id);

        if (likesError) {
          console.error("likes error:", likesError);
          setLikedVideos([]);
        } else {
          const ids = (likesData || []).map((l) => l.video_id).filter(Boolean);
          if (ids.length === 0) {
            setLikedVideos([]);
          } else {
            const { data: likedRows } = await supabase
              .from("videos")
              .select("id, url, view_count, like_count, caption, user_id")
              .in("id", ids);
            setLikedVideos((likedRows as VideoItem[]) || []);
          }
        }
      }

      // 3) Favoris / enregistrés (bookmarks)
      if (activeTab === "favorites" || isOwnProfile) {
        const { data: bmData, error: bmError } = await supabase
          .from("video_bookmarks")
          .select("video_id")
          .eq("user_id", profile.id);

        if (bmError) {
          console.error("bookmarks error:", bmError);
          setSavedVideos([]);
        } else {
          const ids = (bmData || []).map((b) => b.video_id).filter(Boolean);
          if (ids.length === 0) {
            setSavedVideos([]);
          } else {
            const { data: savedRows } = await supabase
              .from("videos")
              .select("id, url, view_count, like_count, caption, user_id")
              .in("id", ids);
            setSavedVideos((savedRows as VideoItem[]) || []);
          }
        }
      }

      // 4) Stats
      try {
        const [{ count: followers }, { count: following }] = await Promise.all([
          supabase
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("following_id", profile.id),
          supabase
            .from("follows")
            .select("*", { count: "exact", head: true })
            .eq("follower_id", profile.id),
        ]);

        const publishedCount = (videosData || []).filter(
          (v) => !v.status || v.status === "published"
        ).length;

        setStats({
          videos_count: publishedCount,
          followers_count: followers || 0,
          following_count: following || 0,
        });
      } catch {
        /* ignore */
      }

      setLoading(false);
    };

    void loadData();
  }, [profile.id, activeTab, isOwnProfile, supabase]);

  const name = profile.full_name || profile.username || "Utilisateur";
  const handle = profile.username ? `@${profile.username}` : "";

  const VideoGrid = ({ items }: { items: VideoItem[] }) => (
    <>
      {items.map((v) => (
        <Link
          key={v.id}
          href={`/videos/${v.id}`}
          className="relative aspect-[3/4] bg-neutral-900"
        >
          {v.url ? (
            <video
              src={v.url}
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-neutral-800" />
          )}
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
        <Link href="/profile/edit" className="p-2">
          <Edit3 className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/calendar" className="p-2">
            <Calendar className="w-5 h-5" />
          </Link>
          <Link href="/profile/find-friends" className="p-2">
            <UserPlus className="w-5 h-5" />
          </Link>
          <button type="button" onClick={() => setMenuOpen(true)} className="p-2">
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-4 mt-2">
        <button
          type="button"
          onClick={() => setAccountDropdown((v) => !v)}
          className="flex items-center gap-1"
        >
          <h1 className="text-xl font-bold">{profile.username || name}</h1>
          <ChevronDown className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-red-500 ml-1" />
        </button>
        {handle && <p className="text-sm text-neutral-400">{handle}</p>}
      </div>

      {/* Stats */}
      <div className="flex gap-8 px-4 mt-5">
        <div>
          <p className="text-lg
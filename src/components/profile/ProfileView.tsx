
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
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
  BadgeCheck,
  Settings,
  MessageCircle,
  Loader2,
  ArrowLeft,
  Ban,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import FollowListModal from "@/components/profile/FollowListModal";

interface ProfileData {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string | null;
  is_verified: boolean;
}

interface VideoData {
  id: string;
  url: string;
  view_count: number;
  like_count: number;
  caption: string | null;
  status: string | null;
  user_id: string | null;
}

type ProfileTab = "videos" | "private" | "saved" | "liked";
type FollowListType = "followers" | "following";

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

function getVideoPlaybackUrl(videoId: string): string {
  return `/api/videos/${encodeURIComponent(videoId)}`;
}

export default function ProfileView({
  profile,
  isOwnProfile,
}: ProfileViewProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const returnToLiveId = searchParams.get("returnToLive");

  const fallbackHref = returnToLiveId
    ? `/live/${encodeURIComponent(returnToLiveId)}`
    : "/";

  const [activeTab, setActiveTab] = useState<ProfileTab>("videos");
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [followListType, setFollowListType] =
    useState<FollowListType | null>(null);

  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockStatusLoading, setBlockStatusLoading] = useState(true);

  const [stats, setStats] = useState({
    followers_count: 0,
    following_count: 0,
    total_likes: 0,
  });

  const handleProfileBack = () => {
    if (returnToLiveId) {
      router.push(fallbackHref);
      return;
    }

    if (typeof window === "undefined") {
      router.push("/");
      return;
    }

    const hasInternalReferrer =
      document.referrer.startsWith(window.location.origin);

    if (window.history.length > 1 && hasInternalReferrer) {
      router.back();
      return;
    }

    router.push("/");
  };

  const loadVideos = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      let videoIds: string[] = [];
      let loadedVideos: VideoData[] = [];

      if (activeTab === "videos" || activeTab === "private") {
        if (activeTab === "private" && !isOwnProfile) {
          setVideos([]);
          return;
        }

        const { data, error } = await supabase
          .from("videos")
          .select("id, url, view_count, like_count, caption, status, user_id")
          .eq("user_id", profile.id)
          .eq("status", activeTab === "private" ? "hidden" : "published")
          .order("created_at", { ascending: false })
          .limit(60);

        if (error) throw error;

        loadedVideos = (data ?? []) as VideoData[];
      }

      if (activeTab === "saved") {
        if (!isOwnProfile) {
          setVideos([]);
          return;
        }

        const { data, error } = await supabase
          .from("video_saves")
          .select("video_id")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(60);

        if (error) throw error;

        videoIds = (data ?? []).map((item) => item.video_id);
      }

      if (activeTab === "liked") {
        const { data, error } = await supabase
          .from("video_likes")
          .select("video_id")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(60);

        if (error) throw error;

        videoIds = (data ?? []).map((item) => item.video_id);
      }

      if (
        (activeTab === "saved" || activeTab === "liked") &&
        videoIds.length > 0
      ) {
        const { data, error } = await supabase
          .from("videos")
          .select("id, url, view_count, like_count, caption, status, user_id")
          .in("id", videoIds)
          .eq("status", "published");

        if (error) throw error;

        const videoMap = new Map(
          ((data ?? []) as VideoData[]).map((video) => [
            video.id,
            video,
          ])
        );

        loadedVideos = videoIds
          .map((id) => videoMap.get(id))
          .filter((video): video is VideoData => Boolean(video));
      }

      // Toutes les vidéos du profil utilisent désormais la route serveur.
      // On ne transmet plus directement les URL de stockage au lecteur.
      const videosWithProtectedUrls = loadedVideos.map((video) => ({
        ...video,
        url: getVideoPlaybackUrl(video.id),
      }));

      setVideos(videosWithProtectedUrls);
    } catch (error) {
      console.error("Erreur chargement vidéos du profil :", error);
      setVideos([]);
      setErrorMessage("Impossible de charger ce contenu pour le moment.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, isOwnProfile, profile.id, supabase]);

  const loadStats = useCallback(async () => {
    try {
      const [
        followersResult,
        followingResult,
        likesResult,
      ] = await Promise.all([
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("following_id", profile.id),

        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("follower_id", profile.id),

        supabase
          .from("videos")
          .select("like_count")
          .eq("user_id", profile.id)
          .eq("status", "published"),
      ]);

      if (followersResult.error) throw followersResult.error;
      if (followingResult.error) throw followingResult.error;
      if (likesResult.error) throw likesResult.error;

      const totalLikes = (likesResult.data ?? []).reduce(
        (sum, video) => sum + (video.like_count || 0),
        0
      );

      setStats({
        followers_count: followersResult.count ?? 0,
        following_count: followingResult.count ?? 0,
        total_likes: totalLikes,
      });
    } catch (error) {
      console.error("Erreur chargement statistiques :", error);
    }
  }, [profile.id, supabase]);

  const loadFollowStatus = useCallback(async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setCurrentUserId(null);
      setIsFollowing(false);
      setIsBlocked(false);
      setBlockStatusLoading(false);
      return;
    }

    setCurrentUserId(user.id);

    if (user.id === profile.id) {
      setIsFollowing(false);
      setIsBlocked(false);
      setBlockStatusLoading(false);
      return;
    }

    const [
      followResult,
      blockResult,
    ] = await Promise.all([
      supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", profile.id)
        .maybeSingle(),

      supabase
        .from("user_blocks")
        .select("id")
        .eq("blocker_id", user.id)
        .eq("blocked_id", profile.id)
        .maybeSingle(),
    ]);

    if (followResult.error) {
      console.error("Erreur vérification abonnement :", followResult.error);
    } else {
      setIsFollowing(Boolean(followResult.data));
    }

    if (blockResult.error) {
      console.error("Erreur vérification blocage :", blockResult.error);
    } else {
      setIsBlocked(Boolean(blockResult.data));
    }

    setBlockStatusLoading(false);
  }, [profile.id, supabase]);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  useEffect(() => {
    void loadStats();
    void loadFollowStatus();
  }, [loadStats, loadFollowStatus]);

  const handleToggleFollow = async () => {
    if (followLoading) return;

    if (!currentUserId) {
      alert("Connectez-vous pour suivre ce profil.");
      router.push("/auth/login");
      return;
    }

    if (currentUserId === profile.id || isBlocked) return;

    setFollowLoading(true);

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", profile.id);

        if (error) throw error;

        setIsFollowing(false);

        setStats((current) => ({
          ...current,
          followers_count: Math.max(0, current.followers_count - 1),
        }));
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({
            follower_id: currentUserId,
            following_id: profile.id,
          });

        if (error) {
          if (error.code === "23505") {
            setIsFollowing(true);
            return;
          }

          throw error;
        }

        setIsFollowing(true);

        setStats((current) => ({
          ...current,
          followers_count: current.followers_count + 1,
        }));
      }
    } catch (error) {
      console.error("Erreur abonnement :", error);
      alert("Impossible de modifier votre abonnement pour le moment.");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleToggleBlock = async () => {
    if (blockLoading || blockStatusLoading) return;

    if (!currentUserId) {
      alert("Connectez-vous pour gérer les utilisateurs bloqués.");
      router.push("/auth/login");
      return;
    }

    if (currentUserId === profile.id) return;

    if (
      !confirm(
        isBlocked
          ? `Voulez-vous débloquer ${profile.full_name || profile.username || "cet utilisateur"} ?`
          : `Voulez-vous bloquer ${profile.full_name || profile.username || "cet utilisateur"} ? Il ne pourra plus vous contacter par les fonctionnalités protégées de Moshi.`
      )
    ) {
      return;
    }

    setBlockLoading(true);

    try {
      if (isBlocked) {
        const { error } = await supabase
          .from("user_blocks")
          .delete()
          .eq("blocker_id", currentUserId)
          .eq("blocked_id", profile.id);

        if (error) throw error;

        setIsBlocked(false);
        alert("Utilisateur débloqué.");
      } else {
        const { error } = await supabase
          .from("user_blocks")
          .insert({
            blocker_id: currentUserId,
            blocked_id: profile.id,
          });

        if (error && error.code !== "23505") throw error;

        setIsBlocked(true);
        setIsFollowing(false);

        setStats((current) => ({
          ...current,
          followers_count: Math.max(0, current.followers_count - 1),
        }));

        alert("Utilisateur bloqué.");
      }

      await loadStats();
    } catch (error) {
      console.error("Erreur blocage utilisateur :", error);
      alert(
        "Impossible de modifier le blocage. Vérifiez votre connexion et réessayez."
      );
    } finally {
      setBlockLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (messageLoading) return;

    if (isBlocked) {
      alert("Débloquez cet utilisateur avant de lui envoyer un message.");
      return;
    }

    setMessageLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        router.push("/auth/login");
        return;
      }

      if (user.id === profile.id) return;

      const { data: myMemberships, error: myMembershipError } =
        await supabase
          .from("conversation_members")
          .select("conversation_id")
          .eq("user_id", user.id);

      if (myMembershipError) throw myMembershipError;

      const myConversationIds = (myMemberships ?? []).map(
        (item) => item.conversation_id
      );

      if (myConversationIds.length > 0) {
        const { data: targetMemberships, error: targetMembershipError } =
          await supabase
            .from("conversation_members")
            .select("conversation_id")
            .eq("user_id", profile.id)
            .in("conversation_id", myConversationIds);

        if (targetMembershipError) throw targetMembershipError;

        const existingConversation = targetMemberships?.[0];

        if (existingConversation) {
          router.push(`/messages/${existingConversation.conversation_id}`);
          return;
        }
      }

      const { data: conversationId, error: rpcError } =
        await supabase.rpc("create_conversation", {
          participant_ids: [user.id, profile.id],
        });

      if (rpcError) throw rpcError;

      if (!conversationId) {
        throw new Error("La conversation n'a pas été créée.");
      }

      router.push(`/messages/${conversationId}`);
    } catch (error) {
      console.error("Erreur ouverture conversation :", error);

      alert(
        error instanceof Error
          ? error.message
          : "Impossible d'ouvrir cette conversation pour le moment."
      );
    } finally {
      setMessageLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm("Supprimer cette vidéo définitivement ?")) return;

    try {
      const { error } = await supabase
        .from("videos")
        .delete()
        .eq("id", videoId)
        .eq("user_id", profile.id);

      if (error) throw error;

      setVideos((current) =>
        current.filter((video) => video.id !== videoId)
      );

      setMenuOpenId(null);
      void loadStats();
    } catch (error) {
      console.error("Erreur suppression vidéo :", error);
      alert("Erreur lors de la suppression.");
    }
  };

  const handleTogglePrivate = async (video: VideoData) => {
    const nextStatus =
      video.status === "hidden" ? "published" : "hidden";

    try {
      const { error } = await supabase
        .from("videos")
        .update({ status: nextStatus })
        .eq("id", video.id)
        .eq("user_id", profile.id);

      if (error) throw error;

      setVideos((current) =>
        current.filter((item) => item.id !== video.id)
      );

      setMenuOpenId(null);
    } catch (error) {
      console.error("Erreur modification visibilité :", error);
      alert("Impossible de modifier la visibilité de cette vidéo.");
    }
  };

  const handleUnsaveVideo = async (videoId: string) => {
    try {
      const { error } = await supabase
        .from("video_saves")
        .delete()
        .eq("video_id", videoId)
        .eq("user_id", profile.id);

      if (error) throw error;

      setVideos((current) =>
        current.filter((video) => video.id !== videoId)
      );

      setMenuOpenId(null);
    } catch (error) {
      console.error("Erreur retrait favori :", error);
      alert("Impossible de retirer cette vidéo des favoris.");
    }
  };

  const name = profile.full_name || profile.username || "Utilisateur";
  const handle = profile.username ? `@${profile.username}` : "";

  const isVendeur =
    profile.role === "vendeur" || profile.role === "seller";

  const isVerified = profile.is_verified === true;

  const tabs: {
    id: ProfileTab;
    label: string;
    icon: typeof Grid3X3;
  }[] = [
    { id: "videos", label: "Vidéos", icon: Grid3X3 },
    { id: "private", label: "Privé", icon: Lock },
    { id: "saved", label: "Favoris", icon: Bookmark },
    { id: "liked", label: "J'aime", icon: Heart },
  ];

  const emptyMessages: Record<ProfileTab, string> = {
    videos: "Aucune vidéo publiée",
    private: "Aucune vidéo privée",
    saved: "Aucune vidéo enregistrée",
    liked: "Aucune vidéo aimée",
  };

  return (
    <>
      <div className="min-h-[100dvh] bg-moshi-bg text-moshi-text pb-24">
        <header className="px-4 pt-6 pb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={handleProfileBack}
            aria-label="Retour à la page précédente"
            className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-moshi-purple hover:bg-white/70 active:scale-95 transition"
          >
            <ArrowLeft className="h-5 w-5" />
            {returnToLiveId ? "Retour au live" : "Retour"}
          </button>

          <div className="flex gap-2">
            {isOwnProfile && (
              <>
                <Link
                  href="/settings"
                  aria-label="Paramètres"
                  title="Paramètres"
                  className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center"
                >
                  <Settings className="w-5 h-5 text-moshi-purple" />
                </Link>

                <Link
                  href="/wallet"
                  aria-label="Mon portefeuille"
                  className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center"
                >
                  <Wallet className="w-5 h-5 text-moshi-purple" />
                </Link>
              </>
            )}

            <button
              type="button"
              aria-label="Partager le profil"
              onClick={() => {
                if (
                  typeof navigator !== "undefined" &&
                  navigator.share
                ) {
                  void navigator
                    .share({
                      title: name,
                      url: window.location.href,
                    })
                    .catch(() => undefined);
                } else if (typeof navigator !== "undefined") {
                  void navigator.clipboard?.writeText(window.location.href);
                  alert("Lien du profil copié.");
                }
              }}
              className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center"
            >
              <Share2 className="w-5 h-5 text-moshi-text" />
            </button>
          </div>
        </header>

        <div className="px-4 flex items-start justify-between mb-4 mt-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-2xl font-bold">{name}</h1>

              {isVerified && (
                <BadgeCheck
                  className="w-5 h-5 text-blue-500 fill-blue-500"
                  aria-label="Compte certifié"
                />
              )}

              {isVendeur && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-[#FF8FB1] to-[#9D7BEA] text-white">
                  Vendeur
                </span>
              )}
            </div>

            <p className="text-sm text-moshi-text/60">{handle}</p>
          </div>

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

        <div className="px-4 flex items-center gap-8 mb-4">
          <button
            type="button"
            onClick={() => setFollowListType("following")}
            className="text-center"
            aria-label="Voir les abonnements"
          >
            <p className="text-lg font-bold">
              {formatNumber(stats.following_count)}
            </p>
            <p className="text-xs text-moshi-text/60">Suivis</p>
          </button>

          <button
            type="button"
            onClick={() => setFollowListType("followers")}
            className="text-center"
            aria-label="Voir les abonnés"
          >
            <p className="text-lg font-bold">
              {formatNumber(stats.followers_count)}
            </p>
            <p className="text-xs text-moshi-text/60">Followers</p>
          </button>

          <div className="text-center">
            <p className="text-lg font-bold">
              {formatNumber(stats.total_likes)}
            </p>
            <p className="text-xs text-moshi-text/60">J'aime</p>
          </div>
        </div>

        {profile.bio && (
          <p className="px-4 text-sm whitespace-pre-wrap leading-snug mb-4">
            {profile.bio}
          </p>
        )}

        {!isOwnProfile && (
          <div className="px-4 mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleToggleFollow()}
              disabled={followLoading || isBlocked}
              className={`flex-1 min-w-[100px] rounded-full py-3 text-sm font-bold transition-all disabled:opacity-60 ${
                isFollowing
                  ? "bg-gray-100 text-gray-800 border border-gray-300"
                  : "moshi-gradient text-white shadow-sm"
              }`}
            >
              {followLoading
                ? "Patientez..."
                : isFollowing
                  ? "Abonné ✓"
                  : "Suivre"}
            </button>

            <button
              type="button"
              onClick={() => void handleSendMessage()}
              disabled={messageLoading || isBlocked}
              className="flex-1 min-w-[100px] rounded-full py-3 text-sm font-bold border border-moshi-purple text-moshi-purple bg-white flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {messageLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MessageCircle className="w-4 h-4" />
              )}
              {messageLoading ? "Ouverture..." : "Message"}
            </button>

            <button
              type="button"
              onClick={() => void handleToggleBlock()}
              disabled={blockLoading || blockStatusLoading}
              className={`rounded-full px-4 py-3 text-sm font-semibold border flex items-center justify-center gap-2 disabled:opacity-60 ${
                isBlocked
                  ? "border-red-200 bg-red-50 text-red-600"
                  : "border-gray-200 bg-white text-gray-600"
              }`}
              aria-label={isBlocked ? "Débloquer cet utilisateur" : "Bloquer cet utilisateur"}
            >
              {blockLoading || blockStatusLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Ban className="w-4 h-4" />
              )}
              {blockStatusLoading
                ? "..."
                : blockLoading
                  ? "Patientez"
                  : isBlocked
                    ? "Débloquer"
                    : "Bloquer"}
            </button>
          </div>
        )}

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

        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;

            const disabled =
              !isOwnProfile &&
              (tab.id === "private" || tab.id === "saved");

            if (disabled) return null;

            return (
              <button
                key={tab.id}
                type="button"
                aria-label={tab.label}
                aria-pressed={selected}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${
                  selected
                    ? "border-moshi-purple text-moshi-purple"
                    : "border-transparent text-gray-400"
                }`}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-[#9D7BEA] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : errorMessage ? (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            <p className="text-sm text-center text-red-500">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() => void loadVideos()}
              className="mt-4 rounded-full bg-moshi-purple px-5 py-2 text-sm font-semibold text-white"
            >
              Réessayer
            </button>
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            {activeTab === "private" ? (
              <Lock className="w-10 h-10 text-gray-300" />
            ) : activeTab === "saved" ? (
              <Bookmark className="w-10 h-10 text-gray-300" />
            ) : activeTab === "liked" ? (
              <Heart className="w-10 h-10 text-gray-300" />
            ) : (
              <Play className="w-10 h-10 text-gray-300" />
            )}

            <p className="text-sm text-moshi-text/60">
              {emptyMessages[activeTab]}
            </p>

            {isOwnProfile && activeTab === "videos" && (
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
                        <button
                          type="button"
                          aria-label="Fermer le menu"
                          className="fixed inset-0 z-30 cursor-default"
                          onClick={() => setMenuOpenId(null)}
                        />

                        <div className="absolute top-9 right-0 z-40 bg-white rounded-xl shadow-xl overflow-hidden min-w-[150px]">
                          {(activeTab === "videos" ||
                            activeTab === "private") && (
                            <button
                              type="button"
                              onClick={() => void handleTogglePrivate(video)}
                              className="flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-gray-50 w-full text-left text-xs font-semibold"
                            >
                              <Lock size={14} />
                              {video.status === "hidden"
                                ? "Rendre public"
                                : "Rendre privé"}
                            </button>
                          )}

                          {activeTab === "saved" && (
                            <button
                              type="button"
                              onClick={() => void handleUnsaveVideo(video.id)}
                              className="flex items-center gap-2 px-4 py-3 text-gray-700 hover:bg-gray-50 w-full text-left text-xs font-semibold"
                            >
                              <Bookmark size={14} />
                              Retirer des favoris
                            </button>
                          )}

                          {(activeTab === "videos" ||
                            activeTab === "private") && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteVideo(video.id)}
                              className="flex items-center gap-2 px-4 py-3 text-red-500 hover:bg-red-50 w-full text-left text-xs font-semibold"
                            >
                              <Trash2 size={14} />
                              Supprimer
                            </button>
                          )}
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

      {followListType && (
        <FollowListModal
          profileId={profile.id}
          type={followListType}
          onClose={() => setFollowListType(null)}
        />
      )}
    </>
  );
}

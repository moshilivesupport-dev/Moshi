"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Heart, UserPlus, MessageCircle, Gift } from "lucide-react";

interface Notification {
  id: string;
  type: "like" | "follow" | "comment" | "gift";
  from_user: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  };
  video_id?: string;
  message?: string;
  created_at: string;
  read: boolean;
}

export default function NotificationList({ userId }: { userId: string }) {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "likes" | "follows" | "messages">("all");

  const loadNotifications = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select(`
        id,
        type,
        from_user_id,
        video_id,
        message,
        created_at,
        read,
        profiles:from_user_id (id, username, avatar_url)
      `)
      .eq("to_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const formatted: Notification[] = (data || []).map((n: any) => ({
      id: n.id,
      type: n.type,
      from_user: n.profiles,
      video_id: n.video_id,
      message: n.message,
      created_at: n.created_at,
      read: n.read,
    }));

    setNotifications(formatted);
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();

    // Écouter les nouvelles notifications
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `to_user_id=eq.${userId}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, supabase]);

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "likes") return n.type === "like";
    if (filter === "follows") return n.type === "follow";
    if (filter === "messages") return n.type === "comment" || n.type === "gift";
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center mb-4">
          <span className="text-2xl">🔔</span>
        </div>
        <p className="text-neutral-400 text-sm">Aucune notification pour le moment</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filtres */}
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
        {(["all", "likes", "follows", "messages"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              filter === f
                ? "bg-white text-black"
                : "bg-neutral-900 text-white hover:bg-neutral-800"
            }`}
          >
            {f === "all" ? "Toutes" : f === "likes" ? "Likes" : f === "follows" ? "Follows" : "Messages"}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="space-y-1">
        {filteredNotifications.map((notif) => (
          <NotificationItem key={notif.id} notification={notif} />
        ))}
      </div>
    </div>
  );
}

function NotificationItem({ notification }: { notification: Notification }) {
  const fromName = notification.from_user.username || "Utilisateur";
  const timeAgo = getTimeAgo(notification.created_at);

  const getIcon = () => {
    switch (notification.type) {
      case "like": return <Heart className="w-4 h-4 text-red-500 fill-red-500" />;
      case "follow": return <UserPlus className="w-4 h-4 text-blue-500" />;
      case "comment": return <MessageCircle className="w-4 h-4 text-green-500" />;
      case "gift": return <Gift className="w-4 h-4 text-yellow-500" />;
      default: return null;
    }
  };

  const getMessage = () => {
    switch (notification.type) {
      case "like": return `a aimé votre vidéo`;
      case "follow": return `s'est abonné à vous`;
      case "comment": return notification.message || `a commenté votre vidéo`;
      case "gift": return notification.message || `vous a envoyé un cadeau`;
      default: return "";
    }
  };

  const getLink = () => {
    if (notification.type === "follow") return `/profile/${notification.from_user.id}`;
    if (notification.video_id) return `/videos/${notification.video_id}`;
    return "/notifications";
  };

  return (
    <Link
      href={getLink()}
      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
        notification.read ? "hover:bg-neutral-900" : "bg-neutral-900/50 hover:bg-neutral-900"
      }`}
    >
      {/* Avatar */}
      <div className="relative w-12 h-12 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0">
        {notification.from_user.avatar_url ? (
          <img src={notification.from_user.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-bold text-neutral-500">
            {fromName.charAt(0).toUpperCase()}
          </div>
        )}
        {/* Icône de type */}
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-black border-2 border-neutral-900 flex items-center justify-center">
          {getIcon()}
        </div>
      </div>

      {/* Texte */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">
          <span className="font-semibold">{fromName}</span>{" "}
          <span className="text-neutral-400">{getMessage()}</span>
        </p>
        <p className="text-xs text-neutral-500 mt-0.5">{timeAgo}</p>
      </div>

      {/* Indicateur non-lu */}
      {!notification.read && (
        <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
      )}
    </Link>
  );
}

function getTimeAgo(dateString: string) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "maintenant";
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)} h`;
  return `il y a ${Math.floor(seconds / 86400)} j`;
}

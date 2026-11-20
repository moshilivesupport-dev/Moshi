
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Heart,
  MessageCircle,
  UserPlus,
  Radio,
  Info,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Actor = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

type NotificationItem = {
  id: string;
  to_user_id: string;
  from_user_id: string | null;
  type: string;
  video_id: string | null;
  message: string | null;
  read: boolean;
  created_at: string;
  actor?: Actor | null;
};

function getIcon(type: string) {
  switch (type) {
    case "follow":
      return UserPlus;
    case "like":
      return Heart;
    case "comment":
      return MessageCircle;
    case "live":
      return Radio;
    default:
      return Info;
  }
}

function timeAgo(date: string) {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  );

  if (seconds < 60) return "À l’instant";
  if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return `Il y a ${Math.floor(seconds / 86400)} j`;

  return new Date(date).toLocaleDateString("fr-FR");
}

export default function NotificationsPage() {
  // Un seul client stable pendant toute la durée de vie du composant.
  const supabase = useMemo(() => createClient(), []);

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const unreadCount = items.filter((item) => !item.read).length;

  const loadNotifications = useCallback(
    async (uid: string) => {
      const { data, error: queryError } = await supabase
        .from("notifications")
        .select(`
          id,
          to_user_id,
          from_user_id,
          type,
          video_id,
          message,
          read,
          created_at
        `)
        .eq("to_user_id", uid)
        .order("created_at", { ascending: false })
        .limit(100);

      if (queryError) {
        setError(queryError.message);
        return;
      }

      const notifications = (data || []) as NotificationItem[];

      const actorIds = Array.from(
        new Set(
          notifications
            .map((item) => item.from_user_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      let actors: Actor[] = [];

      if (actorIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", actorIds);

        if (profileError) {
          setError(profileError.message);
        } else {
          actors = (profiles || []) as Actor[];
        }
      }

      const actorMap = new Map(
        actors.map((actor) => [actor.id, actor])
      );

      setItems(
        notifications.map((item) => ({
          ...item,
          actor: item.from_user_id
            ? actorMap.get(item.from_user_id) || null
            : null,
        }))
      );

      setError("");
    },
    [supabase]
  );

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function initialize() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !user) {
        setError("Connecte-toi pour consulter tes notifications.");
        setLoading(false);
        return;
      }

      const uid = user.id;
      setUserId(uid);

      await loadNotifications(uid);

      if (!active) return;

      channel = supabase
        .channel(`notifications-${uid}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `to_user_id=eq.${uid}`,
          },
          () => {
            void loadNotifications(uid);
          }
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR") {
            console.error(
              "Erreur de synchronisation des notifications."
            );
          }
        });

      setLoading(false);
    }

    void initialize();

    return () => {
      active = false;

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [supabase, loadNotifications]);

  async function markAsRead(id: string) {
    if (!userId) return;

    const previous = items;

    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, read: true } : item
      )
    );

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("to_user_id", userId);

    if (updateError) {
      setItems(previous);
      setError("Impossible de marquer cette notification comme lue.");
    }
  }

  async function markAllAsRead() {
    if (!userId || unreadCount === 0) return;

    const previous = items;

    setItems((current) =>
      current.map((item) => ({
        ...item,
        read: true,
      }))
    );

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("to_user_id", userId)
      .eq("read", false);

    if (updateError) {
      setItems(previous);
      setError("Impossible de tout marquer comme lu.");
    }
  }

  function getNotificationLink(item: NotificationItem) {
    if (item.video_id) {
      return `/videos/${item.video_id}`;
    }

    if (item.from_user_id) {
      return `/profile/${item.from_user_id}`;
    }

    return null;
  }

  return (
    <main className="min-h-screen bg-[#F8F7FC] pb-28">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Retour"
            className="rounded-full p-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Notifications
            </h1>

            <p className="text-xs text-gray-500">
              {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-purple-600 disabled:opacity-40"
        >
          <CheckCheck className="h-4 w-4" />
          Tout lire
        </button>
      </header>

      <section className="mx-auto max-w-xl px-4 py-4">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-purple-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <div className="mb-4 rounded-full bg-purple-100 p-5">
              <Bell className="h-8 w-8 text-purple-600" />
            </div>

            <h2 className="font-bold text-gray-900">
              Aucune notification
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Tes nouvelles notifications apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const Icon = getIcon(item.type);

              const actorName =
                item.actor?.full_name ||
                item.actor?.username ||
                "Un utilisateur";

              const content = (
                <div
                  className={`flex items-start gap-3 rounded-2xl p-4 transition ${
                    item.read ? "bg-white" : "bg-purple-50"
                  }`}
                >
                  <div className="relative shrink-0">
                    {item.actor?.avatar_url ? (
                      <img
                        src={item.actor.avatar_url}
                        alt=""
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-100">
                        <Icon className="h-5 w-5 text-purple-600" />
                      </div>
                    )}

                    <span className="absolute -bottom-1 -right-1 rounded-full border-2 border-white bg-purple-600 p-1">
                      <Icon className="h-3 w-3 text-white" />
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800">
                      {item.from_user_id && (
                        <strong>{actorName} </strong>
                      )}

                      {item.message ||
                        "Tu as une nouvelle notification."}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      {timeAgo(item.created_at)}
                    </p>
                  </div>

                  {!item.read && (
                    <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-purple-600" />
                  )}
                </div>
              );

              const href = getNotificationLink(item);

              return (
                <div key={item.id}>
                  {href ? (
                    <Link
                      href={href}
                      onClick={() => {
                        if (!item.read) {
                          void markAsRead(item.id);
                        }
                      }}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (!item.read) {
                          void markAsRead(item.id);
                        }
                      }}
                      className="block w-full text-left"
                    >
                      {content}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

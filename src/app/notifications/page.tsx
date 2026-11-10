"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Bell } from "lucide-react";

type Notif = {
  id: string;
  type: string;
  message: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
  actor_id: string | null;
  profiles?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

export default function NotificationsPage() {
  const supabase = createClient();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("notifications")
        .select(
          `
          id, type, message, link, read, created_at, actor_id,
          profiles:actor_id (username, full_name, avatar_url)
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setNotifs((data as any) || []);
      setLoading(false);

      // Marquer comme lues
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
    }

    load();
  }, [supabase]);

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-24">
      <header className="sticky top-0 z-20 bg-black/95 backdrop-blur border-b border-neutral-800 px-4 py-4">
        <h1 className="text-xl font-bold">Notifications</h1>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      ) : notifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center px-6">
          <Bell className="w-12 h-12 text-neutral-600 mb-4" />
          <p className="text-neutral-400">Aucune notification pour le moment</p>
        </div>
      ) : (
        <div className="divide-y divide-neutral-900">
          {notifs.map((n) => {
            const name =
              n.profiles?.full_name || n.profiles?.username || "Quelqu’un";
            return (
              <Link
                key={n.id}
                href={n.link || "#"}
                className={`flex items-center gap-3 px-4 py-3 ${
                  !n.read ? "bg-neutral-900/50" : ""
                }`}
              >
                <div className="w-11 h-11 rounded-full overflow-hidden bg-neutral-800 shrink-0">
                  {n.profiles?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={n.profiles.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-semibold">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold">{name}</span>{" "}
                    {n.message || n.type}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {new Date(n.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

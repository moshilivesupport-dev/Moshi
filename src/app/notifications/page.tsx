"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, Bell, ShoppingBag, Gift, Heart, UserPlus, Loader2, Check } from "lucide-react";

export default function NotificationsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data } = await supabase
        .from("notifications")
        .select(`
          id, type, message, read, created_at,
          actor:actor_id (username, avatar_url)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      setNotifications(data || []);
      setLoading(false);
    };
    load();
  }, [supabase, router]);

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id);
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "order": return <ShoppingBag className="w-5 h-5 text-green-400" />;
      case "gift": return <Gift className="w-5 h-5 text-pink-400" />;
      case "like": return <Heart className="w-5 h-5 text-red-500" />;
      case "follow": return <UserPlus className="w-5 h-5 text-blue-400" />;
      default: return <Bell className="w-5 h-5 text-neutral-400" />;
    }
  };

  if (loading) {
    return <div className="min-h-[100dvh] bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 text-neutral-500 animate-spin" /></div>;
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      <header className="sticky top-0 z-30 bg-black flex items-center justify-between px-2 py-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="p-2">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-base font-semibold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="text-xs text-blue-400 font-semibold flex items-center gap-1 px-2">
            <Check className="w-3 h-3" /> Tout lire
          </button>
        )}
      </header>

      <div className="p-4">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Bell className="w-12 h-12 text-neutral-700" />
            <p className="text-neutral-500 text-sm">Aucune notification pour le moment</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => {
              const actor = Array.isArray(notif.actor) ? notif.actor[0] : notif.actor;
              return (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border ${
                    notif.read ? "bg-neutral-900/50 border-neutral-800/50" : "bg-neutral-900 border-neutral-700"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {actor?.avatar_url ? (
                      <img src={actor.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      getIcon(notif.type)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">
                      {actor?.username && <span className="font-bold">@{actor.username} </span>}
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-neutral-500 mt-1">
                      {new Date(notif.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  {!notif.read && <div className="w-2 h-2 rounded-full bg-red-500 mt-2" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
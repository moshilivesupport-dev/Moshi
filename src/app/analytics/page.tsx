"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatNumber } from "@/lib/utils";
import { BarChart3, Eye, Heart, MessageCircle, Share2 } from "lucide-react";

type Stats = {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  watch_time: number;
};

export default function AnalyticsPage() {
  const supabase = createClient();
  const [stats, setStats] = useState<Stats>({
    views: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    watch_time: 0,
  });
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

      // Vidéos du créateur
      const { data: myVideos } = await supabase
        .from("videos")
        .select("id, views_count, likes_count, comments_count")
        .eq("user_id", user.id);

      const videoIds = (myVideos || []).map((v) => v.id);
      let views = 0,
        likes = 0,
        comments = 0;
      (myVideos || []).forEach((v) => {
        views += v.views_count || 0;
        likes += v.likes_count || 0;
        comments += v.comments_count || 0;
      });

      let shares = 0;
      let watch_time = 0;

      if (videoIds.length) {
        const { data: events } = await supabase
          .from("video_events")
          .select("event_type, value")
          .in("video_id", videoIds);

        (events || []).forEach((e) => {
          if (e.event_type === "share") shares += 1;
          if (e.event_type === "watch_time") watch_time += Number(e.value) || 0;
        });
      }

      setStats({ views, likes, comments, shares, watch_time });
      setLoading(false);
    }
    load();
  }, [supabase]);

  const cards = [
    { label: "Vues", value: stats.views, icon: Eye },
    { label: "Likes", value: stats.likes, icon: Heart },
    { label: "Commentaires", value: stats.comments, icon: MessageCircle },
    { label: "Partages", value: stats.shares, icon: Share2 },
  ];

  return (
    <div className="min-h-[100dvh] bg-black text-white px-4 pt-6 pb-24">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-6 h-6 text-red-500" />
        <h1 className="text-xl font-bold">Analytics créateur</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {cards.map((c) => (
              <div
                key={c.label}
                className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4"
              >
                <c.icon className="w-5 h-5 text-neutral-400 mb-2" />
                <p className="text-2xl font-bold">{formatNumber(c.value)}</p>
                <p className="text-xs text-neutral-500">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
            <p className="text-sm text-neutral-400 mb-1">Temps de visionnage total</p>
            <p className="text-xl font-bold">
              {Math.round(stats.watch_time / 60)} min
            </p>
          </div>

          <p className="text-xs text-neutral-600 mt-6 text-center">
            Les événements détaillés sont stockés dans `video_events`.
            Branche des graphiques (Recharts, etc.) pour aller plus loin.
          </p>
        </>
      )}
    </div>
  );
}

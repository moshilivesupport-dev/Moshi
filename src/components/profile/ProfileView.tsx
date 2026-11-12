"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Play } from "lucide-react";
import { formatNumber } from "@/lib/utils";

export default function ProfileVideoGrid({ userId }: { userId: string }) {
  const supabase = createClient();
  const [videos, setVideos] = useState<
    { id: string; url: string; view_count: number | null }[]
  >([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("videos")
        .select("id, url, view_count")
        .eq("user_id", userId)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(60);
      setVideos(data || []);
    })();
  }, [supabase, userId]);

  if (!videos.length) {
    return (
      <p className="text-sm text-neutral-500 text-center py-10">
        Aucune vidéo pour le moment
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-[1px] bg-neutral-900">
      {videos.map((v) => (
        <Link
          key={v.id}
          href={`/videos/${v.id}`}
          className="relative aspect-[3/4] bg-neutral-800 overflow-hidden"
        >
          <video
            src={v.url}
            muted
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-1 left-1 flex items-center gap-0.5 text-white text-[10px] font-semibold drop-shadow">
            <Play className="w-3 h-3 fill-white" />
            {formatNumber(v.view_count || 0)}
          </div>
        </Link>
      ))}
    </div>
  );
}
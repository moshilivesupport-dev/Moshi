"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Music, TrendingUp } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import Link from "next/link";

type Sound = {
  id: string;
  title: string;
  artist: string | null;
  audio_url: string;
  duration: number | null;
  usage_count: number;
  is_trending: boolean;
};

export default function SoundsPage() {
  const supabase = createClient();
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("sounds")
      .select("*")
      .order("is_trending", { ascending: false })
      .order("usage_count", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setSounds((data as Sound[]) || []);
        setLoading(false);
      });
  }, [supabase]);

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-24">
      <header className="sticky top-0 z-20 bg-black/95 backdrop-blur border-b border-neutral-800 px-4 py-4 flex items-center gap-2">
        <Music className="w-5 h-5 text-red-500" />
        <h1 className="text-xl font-bold">Sons tendance</h1>
      </header>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      ) : sounds.length === 0 ? (
        <p className="text-center text-neutral-500 py-20 px-6">
          Aucun son pour le moment.
          <br />
          Ajoute des entrées dans la table `sounds`.
        </p>
      ) : (
        <div className="divide-y divide-neutral-900">
          {sounds.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0">
                <Music className="w-5 h-5 text-neutral-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate flex items-center gap-1.5">
                  {s.title}
                  {s.is_trending && (
                    <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                  )}
                </p>
                <p className="text-xs text-neutral-500 truncate">
                  {s.artist || "Original"} · {formatNumber(s.usage_count)} vidéos
                </p>
              </div>
              <Link
                href={`/videos/new?sound=${s.id}`}
                className="text-xs font-semibold text-red-500 px-3 py-1.5 rounded-full border border-red-500/40"
              >
                Utiliser
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

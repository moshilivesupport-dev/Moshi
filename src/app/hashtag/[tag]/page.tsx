
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Hash, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface HashtagVideo {
  id: string;
  url: string;
  caption: string | null;
  like_count: number | null;
  comment_count: number | null;
  user_id: string;
  created_at: string;
  profiles?: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

function extractHashtags(caption: string | null) {
  return (caption || "").match(/#[\p{L}\p{N}_]+/gu) || [];
}

export default function HashtagPage() {
  const params = useParams<{ tag: string }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const tag = decodeURIComponent(params.tag || "")
    .replace(/^#/, "")
    .trim()
    .toLocaleLowerCase();

  const [videos, setVideos] = useState<HashtagVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVideos = useCallback(async () => {
    if (!tag) {
      setVideos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from("videos")
        .select(`
          id,
          url,
          caption,
          like_count,
          comment_count,
          user_id,
          created_at,
          profiles (
            username,
            avatar_url
          )
        `)
        .eq("status", "published")
        .ilike("caption", `%#${tag}%`)
        .order("created_at", { ascending: false })
        .limit(100);

      if (queryError) throw queryError;

      const matchingVideos = ((data || []) as unknown as HashtagVideo[])
        .filter((video) =>
          extractHashtags(video.caption).some(
            (hashtag) =>
              hashtag.slice(1).toLocaleLowerCase() === tag
          )
        );

      setVideos(matchingVideos);
    } catch (err) {
      console.error("Erreur chargement hashtag :", err);
      setError("Impossible de charger les vidéos de ce hashtag.");
    } finally {
      setLoading(false);
    }
  }, [supabase, tag]);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  return (
    <main className="min-h-[100dvh] bg-black text-white">
      <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-white/10 bg-black/90 px-4 py-4 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Retour"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
        >
          <ArrowLeft size={21} />
        </button>

        <div>
          <div className="flex items-center gap-1">
            <Hash size={20} className="text-[#C084FC]" />
            <h1 className="text-lg font-extrabold">{tag}</h1>
          </div>
          <p className="text-xs text-white/55">
            {videos.length} vidéo{videos.length > 1 ? "s" : ""}
          </p>
        </div>
      </header>

      {loading ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#9D7BEA] border-t-transparent" />
        </div>
      ) : error ? (
        <div className="px-6 py-16 text-center text-sm text-red-300">
          {error}
          <button
            type="button"
            onClick={() => void loadVideos()}
            className="mt-4 block w-full font-bold text-white"
          >
            Réessayer
          </button>
        </div>
      ) : videos.length === 0 ? (
        <div className="flex min-h-[55vh] flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
            <Hash size={30} className="text-[#C084FC]" />
          </div>
          <h2 className="text-lg font-bold">Aucune vidéo pour #{tag}</h2>
          <p className="mt-2 max-w-xs text-sm text-white/55">
            Les vidéos publiées avec ce hashtag apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 p-1">
          {videos.map((video) => (
            <Link
              key={video.id}
              href={`/videos/${video.id}`}
              className="relative aspect-[3/4] overflow-hidden rounded-md bg-neutral-900"
            >
              <video
                src={video.url}
                className="h-full w-full object-cover"
                muted
                playsInline
                preload="metadata"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />

              <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs font-semibold text-white">
                <Play size={13} fill="currentColor" />
                {video.like_count || 0}
              </div>

              {video.profiles?.avatar_url && (
                <div className="absolute right-2 top-2 h-7 w-7 overflow-hidden rounded-full border border-white">
                  <Image
                    src={video.profiles.avatar_url}
                    alt={video.profiles.username || "Créateur"}
                    width={28}
                    height={28}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

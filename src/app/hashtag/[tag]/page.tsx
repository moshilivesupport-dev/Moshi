
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Hash,
  Heart,
  MessageCircle,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface VideoRow {
  id: string;
  url: string;
  caption: string | null;
  like_count: number | null;
  comment_count: number | null;
  user_id: string;
  created_at: string;
}

interface VideoHashtagRelation {
  video_id: string;
  videos: VideoRow | VideoRow[] | null;
}

interface VideoItem extends VideoRow {
  profile: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface HashtagInfo {
  id: string;
  tag: string;
  usage_count: number;
}

export default function HashtagPage() {
  const params = useParams<{ tag: string }>();
  const router = useRouter();

  const supabase = useMemo(() => createClient(), []);

  const tag = useMemo(() => {
    try {
      return decodeURIComponent(params.tag || "")
        .replace(/^#/, "")
        .trim()
        .toLocaleLowerCase();
    } catch {
      return "";
    }
  }, [params.tag]);

  const [hashtag, setHashtag] = useState<HashtagInfo | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHashtag = useCallback(async () => {
    if (!tag) {
      setError("Hashtag invalide.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const {
        data: hashtagData,
        error: hashtagError,
      } = await supabase
        .from("hashtags")
        .select("id, tag, usage_count")
        .eq("tag", tag)
        .maybeSingle();

      if (hashtagError) {
        throw hashtagError;
      }

      if (!hashtagData) {
        setHashtag(null);
        setVideos([]);
        setLoading(false);
        return;
      }

      setHashtag(hashtagData as HashtagInfo);

      const {
        data: relations,
        error: relationsError,
      } = await supabase
        .from("video_hashtags")
        .select(`
          video_id,
          videos!inner (
            id,
            url,
            caption,
            like_count,
            comment_count,
            user_id,
            created_at
          )
        `)
        .eq("hashtag_id", hashtagData.id)
        .order("created_at", {
          ascending: false,
          referencedTable: "videos",
        })
        .limit(100);

      if (relationsError) {
        throw relationsError;
      }

      const typedRelations =
        (relations || []) as unknown as VideoHashtagRelation[];

      const videoRows: VideoRow[] = typedRelations
        .map((relation) => {
          const video = Array.isArray(relation.videos)
            ? relation.videos[0]
            : relation.videos;

          return video ?? null;
        })
        .filter(
          (video): video is VideoRow =>
            !!video && !!video.id && !!video.url
        );

      const uniqueUserIds = [
        ...new Set(videoRows.map((video) => video.user_id)),
      ];

      const profileMap: Record<
        string,
        VideoItem["profile"]
      > = {};

      if (uniqueUserIds.length > 0) {
        const {
          data: profiles,
          error: profilesError,
        } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", uniqueUserIds);

        if (profilesError) {
          throw profilesError;
        }

        (profiles || []).forEach((profile) => {
          profileMap[profile.id] = {
            username: profile.username,
            avatar_url: profile.avatar_url,
          };
        });
      }

      setVideos(
        videoRows.map((video) => ({
          ...video,
          profile: profileMap[video.user_id] || null,
        }))
      );
    } catch (err) {
      console.error("Erreur hashtag :", err);

      setError(
        "Impossible de charger les vidéos de ce hashtag."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, tag]);

  useEffect(() => {
    void loadHashtag();
  }, [loadHashtag]);

  return (
    <main className="min-h-[100dvh] bg-[#09090B] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#09090B]/95 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Retour"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
          >
            <ArrowLeft size={21} />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Hash
                size={21}
                className="text-purple-400"
              />

              <h1 className="truncate text-lg font-extrabold">
                {tag}
              </h1>
            </div>

            <p className="text-xs text-white/50">
              Découvre les vidéos publiées avec ce hashtag
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6">
        {loading ? (
          <div className="flex min-h-[45vh] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-center">
            <p className="text-sm text-red-300">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void loadHashtag()}
              className="mt-4 rounded-full bg-white px-5 py-2 text-sm font-bold text-black"
            >
              Réessayer
            </button>
          </div>
        ) : !hashtag || videos.length === 0 ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-purple-500/10">
              <Hash
                size={36}
                className="text-purple-400"
              />
            </div>

            <h2 className="text-xl font-bold">
              #{tag}
            </h2>

            <p className="mt-2 max-w-xs text-sm text-white/50">
              Aucune vidéo n'est encore associée à ce hashtag.
              Sois parmi les premiers à l'utiliser !
            </p>
          </div>
        ) : (
          <>
            <section className="mb-7 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center gap-2 text-purple-300">
                <TrendingUp size={20} />

                <span className="text-xs font-bold uppercase tracking-wider">
                  Hashtag Moshi
                </span>
              </div>

              <h2 className="mt-3 text-2xl font-black">
                #{hashtag.tag}
              </h2>

              <p className="mt-2 text-sm text-white/55">
                {hashtag.usage_count} vidéo
                {hashtag.usage_count > 1 ? "s" : ""} publiée
                {hashtag.usage_count > 1 ? "s" : ""} avec ce hashtag
              </p>
            </section>

            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold">
                Vidéos
              </h3>

              <span className="text-xs text-white/45">
                {videos.length} résultat
                {videos.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {videos.map((video) => (
                <article
                  key={video.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-black">
                    <video
                      src={video.url}
                      className="h-full w-full object-cover"
                      controls
                      playsInline
                      preload="metadata"
                    />

                    <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-3 text-xs font-bold text-white drop-shadow-lg">
                      <span className="flex items-center gap-1">
                        <Heart size={13} />
                        {video.like_count || 0}
                      </span>

                      <span className="flex items-center gap-1">
                        <MessageCircle size={13} />
                        {video.comment_count || 0}
                      </span>
                    </div>
                  </div>

                  <div className="p-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {video.profile?.avatar_url ? (
                        <Image
                          src={video.profile.avatar_url}
                          alt={
                            video.profile.username || "Créateur"
                          }
                          width={30}
                          height={30}
                          className="h-[30px] w-[30px] shrink-0 rounded-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold">
                          {(video.profile?.username || "M")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}

                      <a
                        href={`/profile/${video.user_id}`}
                        className="truncate text-xs font-bold text-white/90"
                      >
                        @{video.profile?.username || "utilisateur"}
                      </a>
                    </div>

                    {video.caption && (
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/55">
                        {video.caption}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

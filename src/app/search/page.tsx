
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Hash,
  TrendingUp,
  Flame,
  Video,
  X,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface TrendingHashtag {
  id: string;
  tag: string;
  usage_count: number;
  recent_video_count: number;
  last_used_at: string | null;
}

export default function SearchPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [query, setQuery] = useState("");
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHashtags = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error: queryError } = await supabase
        .from("trending_hashtags")
        .select("id, tag, usage_count, recent_video_count, last_used_at")
        .gt("usage_count", 0)
        .order("recent_video_count", { ascending: false })
        .order("usage_count", { ascending: false })
        .limit(50);

      if (queryError) throw queryError;

      setHashtags((data || []) as TrendingHashtag[]);
    } catch (err) {
      console.error("Erreur de recherche Moshi :", err);
      setError("Impossible de charger les hashtags pour le moment.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadHashtags();
  }, [loadHashtags]);

  const normalizedQuery = query
    .trim()
    .replace(/^#/, "")
    .toLocaleLowerCase();

  const results = useMemo(() => {
    if (!normalizedQuery) return hashtags;

    return hashtags.filter((item) =>
      item.tag.toLocaleLowerCase().includes(normalizedQuery)
    );
  }, [hashtags, normalizedQuery]);

  const formatCount = (value: number) => {
    const count = Number(value) || 0;

    if (count >= 1_000_000) {
      return `${(count / 1_000_000).toFixed(1).replace(".0", "")} M`;
    }

    if (count >= 1_000) {
      return `${(count / 1_000).toFixed(1).replace(".0", "")} K`;
    }

    return String(count);
  };

  const openHashtag = (tag: string) => {
    router.push(`/hashtag/${encodeURIComponent(tag)}`);
  };

  return (
    <main className="min-h-[100dvh] bg-[#09090B] pb-10 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#09090B]/95 px-4 pb-4 pt-safe backdrop-blur-xl">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3 py-4">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Retour"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10"
            >
              <ArrowLeft size={21} />
            </button>

            <h1 className="text-xl font-extrabold">Recherche</h1>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 focus-within:border-purple-400/60">
            <Search size={20} className="shrink-0 text-white/50" />

            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && results.length > 0) {
                  openHashtag(results[0].tag);
                }
              }}
              placeholder="Rechercher un hashtag..."
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            />

            {query.length > 0 && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Effacer la recherche"
                className="text-white/50"
              >
                <X size={19} />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        {!normalizedQuery && (
          <>
            <section className="mb-7 rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-900/40 to-pink-900/20 p-5">
              <div className="mb-3 flex items-center gap-2 text-purple-300">
                <Flame size={19} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Découvrir Moshi
                </span>
              </div>

              <h2 className="text-2xl font-black">
                Explore les tendances
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-white/60">
                Découvre les hashtags populaires et retrouve les
                vidéos qui intéressent la communauté.
              </p>

              <Link
                href="/hashtag/trending"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-black"
              >
                Voir toutes les tendances
                <ChevronRight size={17} />
              </Link>
            </section>

            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <TrendingUp size={19} className="text-purple-400" />
                Hashtags populaires
              </h2>
            </div>
          </>
        )}

        {normalizedQuery && (
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-white/60">
              Résultats pour « {query} »
            </h2>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[35vh] items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-center">
            <p className="text-sm text-red-300">{error}</p>

            <button
              type="button"
              onClick={() => void loadHashtags()}
              className="mt-4 rounded-full bg-white px-5 py-2 text-sm font-bold text-black"
            >
              Réessayer
            </button>
          </div>
        ) : results.length === 0 ? (
          <div className="flex min-h-[30vh] flex-col items-center justify-center text-center">
            <Hash size={40} className="mb-4 text-purple-400" />

            <h3 className="font-bold">Aucun hashtag trouvé</h3>

            <p className="mt-2 max-w-xs text-sm text-white/45">
              Ce hashtag n'est pas encore disponible. Essaie
              avec un autre mot-clé.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openHashtag(item.tag)}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:border-purple-500/40 hover:bg-white/[0.07]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
                  <Hash size={23} />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-extrabold">
                    #{item.tag}
                  </h3>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/45">
                    <span className="flex items-center gap-1">
                      <Video size={12} />
                      {formatCount(item.usage_count)} vidéos
                    </span>

                    <span className="flex items-center gap-1 text-emerald-300">
                      <TrendingUp size={12} />
                      {formatCount(item.recent_video_count)} cette semaine
                    </span>
                  </div>
                </div>

                {index < 3 && !normalizedQuery && (
                  <span className="rounded-full bg-purple-500/15 px-2 py-1 text-[10px] font-bold text-purple-300">
                    TOP {index + 1}
                  </span>
                )}

                <ChevronRight
                  size={19}
                  className="shrink-0 text-white/35"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

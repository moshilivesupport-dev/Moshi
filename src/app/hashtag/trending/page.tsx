
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Hash,
  Search,
  TrendingUp,
  Flame,
  Video,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface TrendingHashtag {
  id: string;
  tag: string;
  usage_count: number;
  recent_video_count: number;
  last_used_at: string | null;
}

export default function TrendingHashtagsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHashtags = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error: queryError } = await supabase
        .from("trending_hashtags")
        .select(
          "id, tag, usage_count, recent_video_count, last_used_at"
        )
        .gt("usage_count", 0)
        .order("recent_video_count", { ascending: false })
        .order("usage_count", { ascending: false })
        .limit(100);

      if (queryError) throw queryError;

      setHashtags((data || []) as TrendingHashtag[]);
    } catch (err) {
      console.error("Erreur hashtags tendances :", err);
      setError("Impossible de charger les tendances.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadHashtags();
  }, [loadHashtags]);

  const filteredHashtags = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .replace(/^#/, "")
      .toLocaleLowerCase();

    if (!normalizedSearch) return hashtags;

    return hashtags.filter((item) =>
      item.tag.toLocaleLowerCase().includes(normalizedSearch)
    );
  }, [hashtags, search]);

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

  return (
    <main className="min-h-[100dvh] bg-[#09090B] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#09090B]/95 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Retour"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <ArrowLeft size={21} />
          </button>

          <div className="flex-1">
            <h1 className="text-lg font-extrabold">
              Hashtags tendances
            </h1>
            <p className="text-xs text-white/45">
              Découvre ce qui se passe sur Moshi
            </p>
          </div>

          <TrendingUp className="text-purple-400" size={24} />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-5">
        <div className="mb-6 rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-900/40 to-pink-900/20 p-5">
          <div className="mb-3 flex items-center gap-2 text-purple-300">
            <Flame size={20} />
            <span className="text-xs font-bold uppercase tracking-wider">
              Explorer Moshi
            </span>
          </div>

          <h2 className="text-2xl font-black">
            Les sujets du moment
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Retrouve les hashtags les plus utilisés et les sujets
            qui font parler la communauté.
          </p>
        </div>

        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
          <Search size={19} className="shrink-0 text-white/40" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher un hashtag..."
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-xs font-bold text-purple-300"
            >
              Effacer
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
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
        ) : filteredHashtags.length === 0 ? (
          <div className="flex min-h-[35vh] flex-col items-center justify-center text-center">
            <Hash size={38} className="mb-4 text-purple-400" />

            <h3 className="font-bold">
              Aucun hashtag trouvé
            </h3>

            <p className="mt-2 text-sm text-white/45">
              Essaie un autre mot-clé ou reviens plus tard.
            </p>
          </div>
        ) : (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold">
                Classement des hashtags
              </h3>

              <span className="text-xs text-white/40">
                {filteredHashtags.length} résultats
              </span>
            </div>

            <div className="space-y-3">
              {filteredHashtags.map((item, index) => (
                <Link
                  key={item.id}
                  href={`/hashtag/${encodeURIComponent(item.tag)}`}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-purple-500/40 hover:bg-white/[0.07]"
                >
                  <div className="flex h-10 w-8 shrink-0 items-center justify-center text-lg font-black text-white/35">
                    {index + 1}
                  </div>

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
                    <Hash size={23} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="truncate font-extrabold">
                      #{item.tag}
                    </h4>

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

                  {index < 3 && (
                    <span className="rounded-full bg-purple-500/15 px-2 py-1 text-[10px] font-bold text-purple-300">
                      TOP {index + 1}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

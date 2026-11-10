"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search as SearchIcon } from "lucide-react";
import Link from "next/link";
import FollowButton from "@/components/social/FollowButton";
import { formatNumber } from "@/lib/utils";

type ProfileResult = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  followers_count: number;
};

type VideoResult = {
  id: string;
  title: string | null;
  thumbnail_url: string | null;
  views_count: number;
  user_id: string;
};

export default function SearchPage() {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [profiles, setProfiles] = useState<ProfileResult[]>([]);
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async (q: string) => {
    const term = q.trim();
    if (!term) {
      setProfiles([]);
      setVideos([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    const [pRes, vRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, role, followers_count")
        .or(`username.ilike.%${term}%,full_name.ilike.%${term}%`)
        .limit(20),
      supabase
        .from("videos")
        .select("id, title, thumbnail_url, views_count, user_id")
        .ilike("title", `%${term}%`)
        .eq("is_public", true)
        .order("views_count", { ascending: false })
        .limit(20),
    ]);

    setProfiles((pRes.data as ProfileResult[]) || []);
    setVideos((vRes.data as VideoResult[]) || []);
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-24">
      {/* Barre de recherche */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur px-4 pt-4 pb-3 border-b border-neutral-800">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              search(e.target.value);
            }}
            placeholder="Rechercher des créateurs, vidéos..."
            className="w-full bg-neutral-900 border border-neutral-700 rounded-full pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-red-500/50"
            autoFocus
          />
        </div>
      </div>

      <div className="px-4 py-4 space-y-8">
        {loading && (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {!loading && searched && profiles.length === 0 && videos.length === 0 && (
          <p className="text-center text-neutral-500 py-10">Aucun résultat</p>
        )}

        {/* Créateurs */}
        {profiles.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-neutral-400 mb-3">Créateurs</h2>
            <div className="space-y-3">
              {profiles.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <Link href={`/profil/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-800 shrink-0">
                      {p.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-bold">
                          {(p.full_name || p.username || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {p.full_name || p.username}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">
                        @{p.username} · {formatNumber(p.followers_count || 0)} abonnés
                      </p>
                    </div>
                  </Link>
                  <FollowButton targetUserId={p.id} size="sm" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Vidéos */}
        {videos.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-neutral-400 mb-3">Vidéos</h2>
            <div className="grid grid-cols-3 gap-1">
              {videos.map((v) => (
                <Link
                  key={v.id}
                  href={`/videos/${v.id}`}
                  className="aspect-[9/16] bg-neutral-900 relative overflow-hidden"
                >
                  {v.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.thumbnail_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">
                      Vidéo
                    </div>
                  )}
                  <span className="absolute bottom-1 left-1 text-[10px] text-white bg-black/50 px-1 rounded">
                    {formatNumber(v.views_count)}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}


"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Radio, Users, PlayCircle, Loader2, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Live {
  id: string;
  title: string;
  host_id: string;
  viewer_count: number | null;
  profiles: {
    username: string | null;
    avatar_url: string | null;
    full_name: string | null;
  } | null;
}

export default function MoshiLiveFeed() {
  const supabase = useMemo(() => createClient(), []);
  const [lives, setLives] = useState<Live[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadLives = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError("");

      const { data, error: livesError } = await supabase
        .from("lives")
        .select("id, title, host_id, viewer_count, created_at")
        .eq("status", "live")
        .order("created_at", { ascending: false });

      if (livesError) throw livesError;

      const liveRows = data || [];
      const hostIds = [...new Set(liveRows.map((live) => live.host_id))];

      let profilesMap: Record<
        string,
        Live["profiles"]
      > = {};

      if (hostIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, full_name")
          .in("id", hostIds);

        if (profilesError) throw profilesError;

        (profiles || []).forEach((profile) => {
          profilesMap[profile.id] = {
            username: profile.username,
            avatar_url: profile.avatar_url,
            full_name: profile.full_name,
          };
        });
      }

      setLives(
        liveRows.map((live) => ({
          id: live.id,
          title: live.title || "Live en direct",
          host_id: live.host_id,
          viewer_count: live.viewer_count || 0,
          profiles: profilesMap[live.host_id] || null,
        }))
      );
    } catch (err) {
      console.error("Erreur chargement Moshi Live :", err);
      setError("Impossible de charger les lives. Réessaie.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadLives();

    // Actualisation de secours toutes les 12 secondes.
    const interval = window.setInterval(() => {
      void loadLives(true);
    }, 12000);

    // Actualisation immédiate lorsqu'un live démarre ou se termine.
    const channel = supabase
      .channel("moshi-live-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lives",
        },
        () => {
          void loadLives(true);
        }
      )
      .subscribe();

    return () => {
      window.clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [loadLives, supabase]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-black">
        <Loader2 className="h-9 w-9 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-black px-3 pb-24 pt-36">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            <h1 className="text-lg font-extrabold text-white">
              Moshi Live
            </h1>
          </div>
          <p className="mt-1 text-xs text-white/55">
            {lives.length} direct{lives.length > 1 ? "s" : ""} en cours
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadLives(true)}
          disabled={refreshing}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-50"
          aria-label="Actualiser les lives"
        >
          <RefreshCw
            size={18}
            className={refreshing ? "animate-spin" : ""}
          />
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => void loadLives()}
            className="mt-2 text-xs font-bold text-white underline"
          >
            Réessayer
          </button>
        </div>
      )}

      {lives.length === 0 ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
            <PlayCircle size={42} className="text-white/50" />
          </div>

          <h2 className="text-base font-bold text-white">
            Aucun live pour le moment
          </h2>

          <p className="mt-2 max-w-[250px] text-sm text-white/50">
            Les diffusions en direct apparaîtront ici dès leur démarrage.
          </p>

          <Link
            href="/live/start"
            className="moshi-gradient mt-5 rounded-full px-6 py-3 text-sm font-bold text-white"
          >
            Lancer un live
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {lives.map((live) => {
            const hostName =
              live.profiles?.full_name ||
              live.profiles?.username ||
              "Diffuseur";

            return (
              <Link
                href={`/live/${live.id}`}
                key={live.id}
                className="group relative aspect-[9/16] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900"
              >
                {live.profiles?.avatar_url ? (
                  <Image
                    src={live.profiles.avatar_url}
                    alt={hostName}
                    fill
                    unoptimized
                    className="object-cover opacity-65 transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-pink-900 to-black" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-black/30" />

                <div className="absolute left-2 top-2 flex items-center gap-1.5">
                  <span className="flex items-center gap-1 rounded-full bg-red-600 px-2 py-1 text-[10px] font-extrabold text-white">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    LIVE
                  </span>

                  <span className="flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">
                    <Users size={11} />
                    {Number(live.viewer_count || 0).toLocaleString("fr-FR")}
                  </span>
                </div>

                <div className="absolute bottom-3 left-3 right-3">
                  <div className="mb-2 flex items-center gap-2">
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border-2 border-white bg-zinc-800">
                      {live.profiles?.avatar_url ? (
                        <Image
                          src={live.profiles.avatar_url}
                          alt={hostName}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs font-bold text-white">
                          {hostName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <p className="truncate text-xs font-bold text-white">
                      {hostName}
                    </p>
                  </div>

                  <p className="line-clamp-2 text-xs font-semibold text-white/90">
                    {live.title}
                  </p>

                  <div className="mt-3 rounded-full bg-white px-3 py-2 text-center text-[10px] font-extrabold text-black">
                    REJOINDRE
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

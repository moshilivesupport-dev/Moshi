
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Eye,
  Loader2,
  Trash2,
  X,
  Users,
  Clock3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string | null;
  expires_at: string;
  created_at: string | null;
  duration: number | null;
  caption: string | null;
  views_count: number | null;
}

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

interface StoryViewer {
  viewer_id: string;
  viewed_at: string | null;
  profile: Profile | null;
}

export default function StoryViewerPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const userId = String(params.userId || "");

  const [stories, setStories] = useState<Story[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [viewsCount, setViewsCount] = useState(0);

  const [viewers, setViewers] = useState<StoryViewer[]>([]);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [loadingViewers, setLoadingViewers] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef(0);

  const currentStory = stories[index];
  const isOwner = !!currentUserId && currentUserId === userId;
  const isVideo = currentStory?.media_type === "video";

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetProgress = useCallback(() => {
    progressRef.current = 0;
    setProgress(0);
  }, []);

  const goBack = useCallback(() => {
    stopTimer();
    router.back();
  }, [router, stopTimer]);

  const nextStory = useCallback(() => {
    stopTimer();
    resetProgress();
    setPaused(false);

    if (index < stories.length - 1) {
      setIndex((previous) => previous + 1);
    } else {
      goBack();
    }
  }, [goBack, index, resetProgress, stories.length, stopTimer]);

  const previousStory = useCallback(() => {
    if (index === 0) {
      resetProgress();
      return;
    }

    stopTimer();
    resetProgress();
    setPaused(false);
    setIndex((previous) => previous - 1);
  }, [index, resetProgress, stopTimer]);

  useEffect(() => {
    let active = true;

    async function loadStories() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      setCurrentUserId(user?.id || null);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (!active) return;

      setProfile(profileData);

      const { data, error } = await supabase
        .from("stories")
        .select(
          "id, user_id, media_url, media_type, expires_at, created_at, duration, caption, views_count"
        )
        .eq("user_id", userId)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });

      if (!active) return;

      if (error) {
        console.error("Erreur de chargement des stories :", error);
        setStories([]);
      } else {
        setStories((data || []) as Story[]);
      }

      setLoading(false);
    }

    if (userId) {
      loadStories();
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [supabase, userId]);

  useEffect(() => {
    async function registerView() {
      if (!currentStory || !currentUserId || isOwner) return;

      const { error } = await supabase
        .from("story_views")
        .upsert(
          {
            story_id: currentStory.id,
            viewer_id: currentUserId,
          },
          {
            onConflict: "story_id,viewer_id",
            ignoreDuplicates: true,
          }
        );

      if (error) {
        console.error("Impossible d'enregistrer la vue :", error);
      }
    }

    void registerView();
  }, [currentStory?.id, currentUserId, isOwner, supabase]);

  useEffect(() => {
    let active = true;

    async function loadViewsCount() {
      if (!currentStory || !isOwner) {
        setViewsCount(0);
        return;
      }

      const { count, error } = await supabase
        .from("story_views")
        .select("*", { count: "exact", head: true })
        .eq("story_id", currentStory.id);

      if (!active) return;

      if (error) {
        console.error("Erreur compteur de vues :", error);
        setViewsCount(currentStory.views_count || 0);
        return;
      }

      setViewsCount(count || 0);
    }

    void loadViewsCount();

    return () => {
      active = false;
    };
  }, [currentStory?.id, currentStory?.views_count, isOwner, supabase]);

  const openViewers = async () => {
    if (!currentStory || !isOwner || loadingViewers) return;

    setViewersOpen(true);
    setLoadingViewers(true);
    setViewers([]);

    const { data: viewRows, error: viewsError } = await supabase
      .from("story_views")
      .select("viewer_id, viewed_at")
      .eq("story_id", currentStory.id)
      .order("viewed_at", { ascending: false });

    if (viewsError) {
      console.error("Erreur de chargement des spectateurs :", viewsError);
      setLoadingViewers(false);
      return;
    }

    const rows = viewRows || [];
    const viewerIds = [...new Set(rows.map((row) => row.viewer_id))];

    const profilesMap: Record<string, Profile> = {};

    if (viewerIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", viewerIds);

      if (profilesError) {
        console.error("Erreur de chargement des profils :", profilesError);
      }

      (profilesData || []).forEach((item) => {
        profilesMap[item.id] = item;
      });
    }

    setViewers(
      rows.map((row) => ({
        viewer_id: row.viewer_id,
        viewed_at: row.viewed_at,
        profile: profilesMap[row.viewer_id] || null,
      }))
    );

    setLoadingViewers(false);
  };

  useEffect(() => {
    resetProgress();
    setPaused(false);
    setViewersOpen(false);
  }, [currentStory?.id, resetProgress]);

  useEffect(() => {
    stopTimer();

    if (!currentStory || isVideo || paused) return;

    const duration = Math.max(3, currentStory.duration || 5);
    const startTime =
      Date.now() - (progressRef.current / 100) * duration * 1000;

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const value = Math.min(100, (elapsed / duration) * 100);

      progressRef.current = value;
      setProgress(value);

      if (value >= 100) {
        stopTimer();
        nextStory();
      }
    }, 50);

    return stopTimer;
  }, [currentStory?.id, isVideo, paused, nextStory, stopTimer]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !isVideo) return;

    if (paused) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  }, [paused, currentStory?.id, isVideo]);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  const handleDelete = async () => {
    if (!currentStory || !isOwner || deleting) return;

    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer cette story ?"
    );

    if (!confirmed) return;

    setDeleting(true);

    const { error } = await supabase
      .from("stories")
      .delete()
      .eq("id", currentStory.id)
      .eq("user_id", userId);

    if (error) {
      alert("Impossible de supprimer cette story : " + error.message);
      setDeleting(false);
      return;
    }

    const remaining = stories.filter(
      (story) => story.id !== currentStory.id
    );

    if (remaining.length === 0) {
      goBack();
      return;
    }

    setStories(remaining);
    setIndex(Math.min(index, remaining.length - 1));
    resetProgress();
    setDeleting(false);
  };

  const formatViewedAt = (date: string | null) => {
    if (!date) return "";

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const avatar =
    profile?.avatar_url || "https://i.pravatar.cc/150?img=0";

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!currentStory) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
        <p className="text-lg font-bold">Aucune story disponible</p>
        <p className="text-sm text-white/60">
          Cette story a peut-être expiré ou a été supprimée.
        </p>
        <button
          onClick={goBack}
          className="rounded-full bg-white px-6 py-3 font-bold text-black"
        >
          Retour
        </button>
      </div>
    );
  }

  return (
    <main className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black text-white">
      <div className="relative flex h-full w-full max-w-3xl flex-col justify-center">
        <div className="absolute left-0 right-0 top-0 z-30 px-3 pt-[max(env(safe-area-inset-top),12px)]">
          <div className="mb-3 flex gap-1">
            {stories.map((story, storyIndex) => (
              <div
                key={story.id}
                className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30"
              >
                <div
                  className="h-full rounded-full bg-white"
                  style={{
                    width:
                      storyIndex < index
                        ? "100%"
                        : storyIndex === index
                        ? `${progress}%`
                        : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/50">
                <Image
                  src={avatar}
                  alt="Profil"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>

              <div>
                <p className="text-sm font-bold">
                  {profile?.username || "Utilisateur"}
                </p>
                <p className="text-[11px] text-white/70">
                  {index + 1} / {stories.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isOwner && (
                <>
                  <button
                    type="button"
                    onClick={openViewers}
                    className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-2 text-sm transition hover:bg-white/20"
                    aria-label="Voir les spectateurs"
                  >
                    <Eye size={17} />
                    <span>{viewsCount}</span>
                    <Users size={16} />
                  </button>

                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    aria-label="Supprimer la story"
                    className="rounded-full bg-black/30 p-2"
                  >
                    {deleting ? (
                      <Loader2 size={19} className="animate-spin" />
                    ) : (
                      <Trash2 size={19} />
                    )}
                  </button>
                </>
              )}

              <button
                onClick={goBack}
                aria-label="Fermer"
                className="rounded-full bg-black/30 p-2"
              >
                <X size={22} />
              </button>
            </div>
          </div>
        </div>

        <div className="relative mx-auto aspect-video w-full overflow-hidden bg-black">
          {isVideo ? (
            <video
              key={currentStory.id}
              ref={videoRef}
              src={currentStory.media_url}
              className="h-full w-full object-contain"
              autoPlay
              playsInline
              onTimeUpdate={(event) => {
                const video = event.currentTarget;

                if (video.duration > 0) {
                  const value =
                    (video.currentTime / video.duration) * 100;

                  progressRef.current = value;
                  setProgress(value);
                }
              }}
              onEnded={nextStory}
              onClick={() => setPaused((value) => !value)}
            />
          ) : (
            <Image
              src={currentStory.media_url}
              alt="Story"
              fill
              unoptimized
              priority
              className="object-contain"
            />
          )}

          <button
            aria-label="Story précédente"
            onClick={previousStory}
            className="absolute bottom-0 left-0 top-0 z-10 w-1/4"
          />

          <button
            aria-label="Story suivante"
            onClick={nextStory}
            className="absolute bottom-0 right-0 top-0 z-10 w-1/4"
          />

          <button
            aria-label={paused ? "Reprendre" : "Mettre en pause"}
            onClick={() => setPaused((value) => !value)}
            className="absolute bottom-0 left-1/4 right-1/4 top-0 z-20"
          />

          {paused && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/20">
              <div className="rounded-full bg-black/50 px-4 py-2 text-sm font-bold">
                En pause
              </div>
            </div>
          )}

          {currentStory.caption && (
            <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-30 rounded-xl bg-black/40 px-4 py-3 text-center text-sm">
              {currentStory.caption}
            </div>
          )}
        </div>

        <div className="absolute bottom-5 left-0 right-0 z-30 flex justify-center px-4">
          <button
            onClick={goBack}
            className="rounded-full border border-white/20 bg-black/50 px-5 py-2 text-sm font-semibold backdrop-blur"
          >
            <ArrowLeft className="mr-2 inline" size={16} />
            Retour
          </button>
        </div>
      </div>

      {viewersOpen && isOwner && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center">
          <div className="flex max-h-[75vh] w-full max-w-lg flex-col rounded-t-3xl border border-white/10 bg-[#151515] sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold">Spectateurs</h2>
                <p className="text-xs text-white/50">
                  {viewers.length} personne(s) enregistrée(s)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewersOpen(false)}
                aria-label="Fermer la liste"
                className="rounded-full bg-white/10 p-2"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto px-4 py-3">
              {loadingViewers ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-white/60">
                  <Loader2 size={20} className="animate-spin" />
                  Chargement des spectateurs...
                </div>
              ) : viewers.length === 0 ? (
                <div className="py-10 text-center">
                  <Eye className="mx-auto mb-3 text-white/40" size={30} />
                  <p className="text-sm font-semibold">
                    Aucun spectateur pour le moment
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    Les personnes qui regarderont cette story apparaîtront ici.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {viewers.map((viewer) => (
                    <div
                      key={viewer.viewer_id}
                      className="flex items-center gap-3 rounded-xl px-2 py-3"
                    >
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white/10">
                        {viewer.profile?.avatar_url ? (
                          <Image
                            src={viewer.profile.avatar_url}
                            alt="Avatar"
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-lg font-bold">
                            {(viewer.profile?.username || "U")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {viewer.profile?.username || "Utilisateur"}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-white/50">
                          <Clock3 size={12} />
                          {formatViewedAt(viewer.viewed_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

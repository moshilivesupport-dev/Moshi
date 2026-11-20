
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Trash2, X } from "lucide-react";
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
}

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
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

  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentStory = stories[index];
  const isOwner = !!currentUserId && currentUserId === userId;

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const goBack = useCallback(() => {
    stopTimer();
    router.back();
  }, [router, stopTimer]);

  const nextStory = useCallback(() => {
    stopTimer();
    setProgress(0);
    setPaused(false);

    if (index < stories.length - 1) {
      setIndex((previous) => previous + 1);
    } else {
      goBack();
    }
  }, [goBack, index, stories.length, stopTimer]);

  const previousStory = useCallback(() => {
    stopTimer();
    setProgress(0);
    setPaused(false);
    setIndex((previous) => Math.max(0, previous - 1));
  }, [stopTimer]);

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
          "id, user_id, media_url, media_type, expires_at, created_at, duration, caption"
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

    if (userId) loadStories();

    return () => {
      active = false;
    };
  }, [supabase, userId]);

  useEffect(() => {
    stopTimer();
    setProgress(0);
    setPaused(false);

    if (!currentStory || currentStory.media_type === "video" || paused) {
      return;
    }

    const duration = Math.max(3, currentStory.duration || 5);
    const startedAt = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const value = Math.min(100, (elapsed / duration) * 100);

      setProgress(value);

      if (value >= 100) {
        nextStory();
      }
    }, 50);

    return stopTimer;
  }, [currentStory, index, paused, nextStory, stopTimer]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (paused) {
      video.pause();
    } else if (currentStory?.media_type === "video") {
      video.play().catch(() => {});
    }
  }, [paused, currentStory, index]);

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

    const remaining = stories.filter((story) => story.id !== currentStory.id);

    if (remaining.length === 0) {
      goBack();
      return;
    }

    setStories(remaining);
    setIndex(Math.min(index, remaining.length - 1));
    setProgress(0);
    setDeleting(false);
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

  const isVideo = currentStory.media_type === "video";

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

        <div
          className="relative mx-auto aspect-video w-full overflow-hidden bg-black"
          onDoubleClick={() => setPaused((value) => !value)}
        >
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
                  setProgress((video.currentTime / video.duration) * 100);
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
            className="absolute bottom-0 left-0 top-0 z-10 flex w-[25%] items-center justify-start pl-3"
          >
            {index > 0 && <ChevronLeft className="opacity-0" size={24} />}
          </button>

          <button
            aria-label="Story suivante"
            onClick={nextStory}
            className="absolute bottom-0 right-0 top-0 z-10 flex w-[25%] items-center justify-end pr-3"
          >
            <ChevronRight className="opacity-0" size={24} />
          </button>

          {!isVideo && (
            <button
              aria-label={paused ? "Reprendre" : "Mettre en pause"}
              onClick={() => setPaused((value) => !value)}
              className="absolute inset-y-0 left-1/4 right-1/4 z-20"
            />
          )}

          {paused && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/20">
              <div className="rounded-full bg-black/50 px-4 py-2 text-sm font-bold">
                En pause
              </div>
            </div>
          )}

          {currentStory.caption && (
            <div className="absolute bottom-4 left-4 right-4 z-30 rounded-xl bg-black/40 px-4 py-3 text-center text-sm">
              {currentStory.caption}
            </div>
          )}
        </div>

        <div className="absolute bottom-5 left-0 right-0 z-30 flex justify-center gap-3 px-4">
          <button
            onClick={goBack}
            className="rounded-full border border-white/20 bg-black/50 px-5 py-2 text-sm font-semibold backdrop-blur"
          >
            <ArrowLeft className="mr-2 inline" size={16} />
            Retour
          </button>
        </div>
      </div>
    </main>
  );
}

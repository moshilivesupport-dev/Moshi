
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Plus, Camera, Video, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: "image" | "video";
  expires_at: string;
  created_at: string | null;
}

interface StoryGroup {
  user_id: string;
  username: string;
  avatar_url: string | null;
  stories: Story[];
}

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

const MAX_FILE_SIZE = 30 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

export default function StoriesBar() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stories, setStories] = useState<StoryGroup[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<"image" | "video">("image");

  const loadStories = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setCurrentUser(user);

    if (!user) {
      setCurrentProfile(null);
      setStories([]);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    setCurrentProfile(profile);

    const { data: followsData, error: followsError } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    if (followsError) {
      console.error("Erreur abonnements :", followsError);
    }

    const followedIds = (followsData || []).map(
      (follow) => follow.following_id
    );

    const visibleUserIds = [...new Set([user.id, ...followedIds])];

    const { data, error } = await supabase
      .from("stories")
      .select("id, user_id, media_url, media_type, expires_at, created_at")
      .in("user_id", visibleUserIds)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Erreur de chargement des stories :", error);
      return;
    }

    if (!data?.length) {
      setStories([]);
      return;
    }

    const userIds = [...new Set(data.map((story) => story.user_id))];

    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", userIds);

    const profilesMap: Record<string, Profile> = {};

    (profilesData || []).forEach((item) => {
      profilesMap[item.id] = item;
    });

    const grouped: Record<string, StoryGroup> = {};

    data.forEach((story) => {
      const ownerId = story.user_id;
      const ownerProfile = profilesMap[ownerId];

      if (!grouped[ownerId]) {
        grouped[ownerId] = {
          user_id: ownerId,
          username: ownerProfile?.username || "Utilisateur",
          avatar_url: ownerProfile?.avatar_url || null,
          stories: [],
        };
      }

      grouped[ownerId].stories.push({
        ...story,
        media_type: story.media_type === "video" ? "video" : "image",
      });
    });

    const groups = Object.values(grouped);

    groups.sort((a, b) => {
      if (a.user_id === user.id) return -1;
      if (b.user_id === user.id) return 1;

      const aLatest = a.stories[a.stories.length - 1]?.created_at || "";
      const bLatest = b.stories[b.stories.length - 1]?.created_at || "";

      return bLatest.localeCompare(aLatest);
    });

    setStories(groups);
  }, [supabase]);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  const openFilePicker = (type: "image" | "video") => {
    setSelectedType(type);
    setIsMenuOpen(false);

    if (fileInputRef.current) {
      fileInputRef.current.accept =
        type === "image"
          ? ALLOWED_IMAGE_TYPES.join(",")
          : ALLOWED_VIDEO_TYPES.join(",");

      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!currentUser) {
      alert("Connecte-toi pour publier une story.");
      event.target.value = "";
      return;
    }

    const validTypes =
      selectedType === "image"
        ? ALLOWED_IMAGE_TYPES
        : ALLOWED_VIDEO_TYPES;

    if (!validTypes.includes(file.type)) {
      alert(
        selectedType === "image"
          ? "Format accepté : JPG, PNG ou WEBP."
          : "Format accepté : MP4, WEBM ou MOV."
      );
      event.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      alert("Une story ne peut pas dépasser 30 Mo.");
      event.target.value = "";
      return;
    }

    setUploading(true);

    const extension =
      file.name.split(".").pop()?.toLowerCase() ||
      (selectedType === "video" ? "mp4" : "jpg");

    const filePath = `${currentUser.id}/${crypto.randomUUID()}.${extension}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("stories")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("stories")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from("stories")
        .insert({
          user_id: currentUser.id,
          media_url: publicData.publicUrl,
          media_type: selectedType,
          expires_at: new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ).toISOString(),
          duration: 5,
        });

      if (insertError) {
        await supabase.storage.from("stories").remove([filePath]);
        throw insertError;
      }

      alert("Story publiée avec succès !");
      await loadStories();
    } catch (error: any) {
      console.error("Erreur de publication :", error);
      alert("Erreur : " + (error?.message || "Publication impossible."));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const avatar =
    currentProfile?.avatar_url ||
    currentUser?.user_metadata?.avatar_url ||
    "https://i.pravatar.cc/150?img=0";

  return (
    <>
      <div className="flex items-start gap-4 overflow-x-auto scrollbar-hide py-2 pointer-events-auto">
        {currentUser && (
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="flex shrink-0 flex-col items-center gap-1"
          >
            <div className="h-16 w-16 rounded-full border-2 border-dashed border-gray-400 p-1">
              <div className="relative h-full w-full overflow-hidden rounded-full bg-gray-200">
                <Image
                  src={avatar}
                  alt="Ma story"
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                  unoptimized
                />
                <div className="moshi-gradient absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white">
                  <Plus size={12} className="text-white" strokeWidth={3} />
                </div>
              </div>
            </div>
            <span className="max-w-[64px] truncate text-[10px] font-semibold text-white">
              Votre story
            </span>
          </button>
        )}

        {stories.map((group) => {
          const isMine = group.user_id === currentUser?.id;
          const lastStory = group.stories[group.stories.length - 1];

          return (
            <button
              type="button"
              key={group.user_id}
              onClick={() => router.push(`/stories/${group.user_id}`)}
              className="flex shrink-0 flex-col items-center gap-1"
            >
              <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-moshi-pink via-moshi-purple to-moshi-blue p-[2px]">
                <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-black">
                  {group.avatar_url ? (
                    <Image
                      src={group.avatar_url}
                      alt={group.username}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : lastStory.media_type === "video" ? (
                    <video
                      src={lastStory.media_url}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-700 text-xl font-bold text-white">
                      {group.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              <span className="max-w-[64px] truncate text-[10px] font-semibold text-white">
                {isMine ? "Votre story" : group.username}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-[32px] bg-white p-6 pb-safe"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-moshi-text">
                  Nouvelle Story
                </h2>

                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => openFilePicker("image")}
                  className="flex flex-col items-center gap-3 rounded-3xl border border-purple-100 bg-purple-50 p-6 disabled:opacity-50"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500 text-white">
                    <Camera size={26} />
                  </div>
                  <p className="text-sm font-bold text-moshi-text">Photo</p>
                </button>

                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => openFilePicker("video")}
                  className="flex flex-col items-center gap-3 rounded-3xl border border-pink-100 bg-pink-50 p-6 disabled:opacity-50"
                >
                  <div className="moshi-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-white">
                    <Video size={26} />
                  </div>
                  <p className="text-sm font-bold text-moshi-text">Vidéo</p>
                </button>
              </div>

              {uploading && (
                <div className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-moshi-purple">
                  <Loader2 size={18} className="animate-spin" />
                  Publication en cours...
                </div>
              )}

              <p className="mt-4 text-center text-xs text-gray-500">
                Photos et vidéos de 30 Mo maximum. Les stories disparaissent après 24 heures.
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </>
  );
}

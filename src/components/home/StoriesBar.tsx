
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Plus,
  Camera,
  Video,
  X,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: "image" | "video";
  expires_at: string | null;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export default function StoriesBar() {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stories, setStories] = useState<Story[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<"image" | "video">("image");

  useEffect(() => {
    let mounted = true;

    const loadStories = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;
      setCurrentUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (mounted) setCurrentProfile(profile);
      }

      const { data, error } = await supabase
        .from("stories")
        .select("id, user_id, media_url, media_type, expires_at")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error || !data || !mounted) return;

      const userIds = [...new Set(data.map((story) => story.user_id))];

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      if (!mounted) return;

      const profilesMap: Record<string, any> = {};

      (profilesData || []).forEach((profile) => {
        profilesMap[profile.id] = profile;
      });

      setStories(
        data.map((story) => ({
          ...story,
          media_type: story.media_type || "image",
          profiles: profilesMap[story.user_id] || null,
        }))
      );
    };

    loadStories();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const openFilePicker = (type: "image" | "video") => {
    setSelectedType(type);
    setIsMenuOpen(false);

    if (fileInputRef.current) {
      fileInputRef.current.accept =
        type === "image" ? "image/*" : "video/*";
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file || !currentUser) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (
      (selectedType === "image" && !isImage) ||
      (selectedType === "video" && !isVideo)
    ) {
      alert("Le fichier sélectionné ne correspond pas au type choisi.");
      event.target.value = "";
      return;
    }

    const maxSize = selectedType === "video"
      ? 100 * 1024 * 1024
      : 15 * 1024 * 1024;

    if (file.size > maxSize) {
      alert(
        selectedType === "video"
          ? "La vidéo ne doit pas dépasser 100 Mo."
          : "La photo ne doit pas dépasser 15 Mo."
      );
      event.target.value = "";
      return;
    }

    setUploading(true);

    const extension = file.name.split(".").pop()?.toLowerCase() || (
      selectedType === "video" ? "mp4" : "jpg"
    );

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

      const {
        data: { publicUrl },
      } = supabase.storage.from("stories").getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from("stories")
        .insert({
          user_id: currentUser.id,
          media_url: publicUrl,
          media_type: selectedType,
          expires_at: new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ).toISOString(),
        });

      if (insertError) {
        await supabase.storage.from("stories").remove([filePath]);
        throw insertError;
      }

      alert("Story publiée !");
      window.location.reload();
    } catch (error: any) {
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
            onClick={() => setIsMenuOpen(true)}
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-400 p-1">
              <div className="w-full h-full rounded-full bg-gray-200 overflow-hidden relative">
                <Image
                  src={avatar}
                  alt="Ma story"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                  unoptimized
                />
                <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full moshi-gradient flex items-center justify-center border-2 border-white">
                  <Plus size={12} className="text-white" strokeWidth={3} />
                </div>
              </div>
            </div>
            <span className="text-[10px] font-semibold max-w-[64px] truncate">
              Votre story
            </span>
          </button>
        )}

        {stories.map((story) => {
          const name = story.profiles?.username || "Utilisateur";

          return (
            <button
              key={story.id}
              onClick={() => router.push(`/stories/${story.user_id}`)}
              className="flex flex-col items-center gap-1 shrink-0"
            >
              <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-moshi-pink via-moshi-purple to-moshi-blue">
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-white relative">
                  {story.media_type === "video" ? (
                    <video
                      src={story.media_url}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <Image
                      src={story.media_url}
                      alt={name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  )}
                </div>
              </div>
              <span className="text-[10px] font-semibold max-w-[64px] truncate">
                {name}
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
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60]"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-[32px] p-6 pb-safe"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-extrabold text-moshi-text">
                  Nouvelle Story
                </h2>

                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={uploading}
                  onClick={() => openFilePicker("image")}
                  className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-purple-50 border border-purple-100 disabled:opacity-50"
                >
                  <div className="w-14 h-14 rounded-2xl bg-purple-500 flex items-center justify-center text-white">
                    <Camera size={26} />
                  </div>
                  <p className="font-bold text-moshi-text text-sm">Photo</p>
                </button>

                <button
                  disabled={uploading}
                  onClick={() => openFilePicker("video")}
                  className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-pink-50 border border-pink-100 disabled:opacity-50"
                >
                  <div className="w-14 h-14 rounded-2xl moshi-gradient flex items-center justify-center text-white">
                    <Video size={26} />
                  </div>
                  <p className="font-bold text-moshi-text text-sm">Vidéo</p>
                </button>
              </div>

              {uploading && (
                <div className="mt-5 flex items-center justify-center gap-2 text-sm text-moshi-purple font-bold">
                  <Loader2 size={18} className="animate-spin" />
                  Publication en cours...
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </>
  );
}

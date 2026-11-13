"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Home, Radio, Plus, ShoppingBag, User, Store, X, Music,
  RefreshCw, Zap, ZapOff, Clock, LayoutGrid, Sparkles,
  ChevronDown, Upload,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import CreateVideoFooter, {
  type DurationKey,
  type TabKey,
} from "@/components/layout/CreateVideoFooter";

interface NavbarProps {
  role?: string;
  sellerStatus?: string;
}

interface RecentVideo {
  id: string;
  url: string;
}

function durationToSeconds(d: DurationKey): number | null {
  switch (d) {
    case "10min": return 120;
    case "60s": return 60;
    case "15s": return 15;
    default: return null;
  }
}

export default function Navbar({ role }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [mode, setMode] = useState<TabKey>("camera");
  const [duration, setDuration] = useState<DurationKey>("15s");
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [flashOn, setFlashOn] = useState(false);
  const [timerOn, setTimerOn] = useState(false);
  const [gridOn, setGridOn] = useState(false);
  const [effectsOn, setEffectsOn] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const isSeller = role === "vendeur" || role === "seller" || role === "admin";

  // Auto-open caméra si ?openCamera=true
  useEffect(() => {
    if (searchParams.get("openCamera") === "true") {
      setIsCreateOpen(true);
      router.replace(pathname);
    }
  }, [searchParams, pathname, router]);

  useEffect(() => {
    if (!isCreateOpen) return;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsCreateOpen(false);
        router.push("/auth/login");
        return;
      }
      setUserId(user.id);
    };
    load();
  }, [isCreateOpen, supabase, router]);

  useEffect(() => {
    if (!isCreateOpen || mode !== "camera") {
      stopCamera();
      return;
    }
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateOpen, mode, facingMode]);

  useEffect(() => {
    if (!isCreateOpen) {
      stopRecording();
      stopCamera();
      setError(null);
    }
  }, [isCreateOpen]);

  function startCamera() {
    stopCamera();
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode }, audio: true })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => setError("Caméra inaccessible. Vérifie les permissions."));
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    mediaRecorderRef.current = null;
    setRecording(false);
    setCountdown(null);
  }

  const publishFile = useCallback(
    async (file: Blob, ext: string, isVideo: boolean, captionText?: string) => {
      if (!userId) return;
      setUploading(true);
      setError(null);
      try {
        let durationSeconds = 0;
        if (isVideo) {
          const v = document.createElement("video");
          v.preload = "metadata";
          v.src = URL.createObjectURL(file);
          durationSeconds = await new Promise<number>((resolve) => {
            v.onloadedmetadata = () => resolve(Math.round(v.duration) || 0);
          });
          URL.revokeObjectURL(v.src);
        }
        const fileName = `${userId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("videos")
          .upload(fileName, file, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage
          .from("videos")
          .getPublicUrl(fileName);

        const { error: dbErr } = await supabase.from("videos").insert({
          user_id: userId,
          url: urlData.publicUrl,
          caption: (captionText ?? "").trim() || null,
          is_public: true,
          status: "published",
          view_count: 0,
          like_count: 0,
          comment_count: 0,
          duration_seconds: durationSeconds,
        });
        if (dbErr) throw dbErr;

        stopCamera();
        setIsCreateOpen(false);
        router.push("/");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur lors de la publication.";
        setError(message);
      } finally {
        setUploading(false);
      }
    },
    [userId, router, supabase]
  );

  const startRecording = useCallback(() => {
    if (!streamRef.current) {
      setError("Active la caméra d'abord.");
      return;
    }
    setError(null);
    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const mr = new MediaRecorder(streamRef.current, { mimeType: mime });
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      await publishFile(blob, "webm", true);
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setRecording(true);

    const totalSeconds = durationToSeconds(duration);
    if (totalSeconds !== null) {
      let remaining: number = totalSeconds;
      setCountdown(remaining);
      const id = setInterval(() => {
        remaining = remaining - 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(id);
          stopRecording();
        }
      }, 1000);
    }
  }, [duration, publishFile]);

  const handleRecordAction = useCallback(() => {
    if (uploading) return;
    if (mode === "create") {
      fileInputRef.current?.click();
      return;
    }
    if (mode === "camera") {
      if (recording) stopRecording();
      else startRecording();
      return;
    }
    if (mode === "live") {
      stopCamera();
      setIsCreateOpen(false);
      router.push("/live/start");
      return;
    }
  }, [uploading, mode, recording, startRecording, router]);

  function onVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    publishFile(f, f.name.split(".").pop() || "mp4", true);
  }

  function onPhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    publishFile(f, f.name.split(".").pop() || "jpg", false);
  }

  return (
    <>
      {isCreateOpen && (
        <div className="fixed inset-0 z-[60] bg-black text-white flex flex-col select-none">
          <input ref={fileInputRef} type="file" accept="video/*" onChange={onVideoFile} className="hidden" />
          <input ref={photoInputRef} type="file" accept="image/*" onChange={onPhotoFile} className="hidden" />

          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <button onClick={() => setIsCreateOpen(false)} className="p-2">
              <X className="w-7 h-7" />
            </button>
            <button
              onClick={() => { setIsCreateOpen(false); router.push("/sounds"); }}
              className="flex items-center gap-2 bg-neutral-800/70 px-4 py-2 rounded-full text-sm font-medium"
            >
              <Music className="w-4 h-4" /> Ajouter un son
            </button>
            <div className="flex flex-col items-center gap-1">
              <button onClick={() => setFacingMode((f) => (f === "user" ? "environment" : "user"))} className="p-2">
                <RefreshCw className="w-6 h-6" />
              </button>
              <button onClick={() => setFlashOn((v) => !v)} className="p-2">
                {flashOn ? <Zap className="w-6 h-6 text-yellow-400" /> : <ZapOff className="w-6 h-6" />}
              </button>
              <div className="w-8 border-t border-neutral-700 my-1" />
              <button onClick={() => setTimerOn((v) => !v)} className={cn("p-2", timerOn && "text-red-500")}>
                <Clock className="w-6 h-6" />
              </button>
              <button onClick={() => setGridOn((v) => !v)} className={cn("p-2", gridOn && "text-red-500")}>
                <LayoutGrid className="w-6 h-6" />
              </button>
              <button onClick={() => setEffectsOn((v) => !v)} className={cn("p-2", effectsOn && "text-red-500")}>
                <Sparkles className="w-6 h-6" />
              </button>
              <button onClick={() => setIsCreateOpen(false)} className="p-2">
                <ChevronDown className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="relative flex-1 mx-auto w-full max-w-md overflow-hidden">
            {mode === "camera" ? (
              <video
                ref={videoRef} autoPlay playsInline muted
                className={cn("absolute inset-0 w-full h-full object-cover", facingMode === "user" && "scale-x-[-1]", effectsOn && "grayscale")}
              />
            ) : mode === "create" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-neutral-400">
                <Upload className="w-12 h-12" />
                <p className="text-sm">Choisis une vidéo à publier</p>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Radio className="w-12 h-12 text-red-500" />
                <p className="text-sm text-neutral-400">Prêt à lancer ton LIVE</p>
              </div>
            )}

            {gridOn && (
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                {Array.from({ length: 9 }).map((_, i) => <div key={i} className="border border-white/20" />)}
              </div>
            )}
            {timerOn && countdown !== null && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-5xl font-bold text-red-500 drop-shadow">{countdown}</div>
            )}
            {error && (
              <div className="absolute bottom-24 left-4 right-4 bg-red-600/90 text-white text-sm px-4 py-2 rounded-lg text-center">{error}</div>
            )}
          </div>

          <CreateVideoFooter
            role={role}
            activeTab={mode}
            onTabChange={setMode}
            selectedDuration={duration}
            onDurationChange={setDuration}
            isRecording={recording}
            onRecordToggle={handleRecordAction}
            isUploading={uploading}
            onLiveClick={() => {
              stopCamera();
              setIsCreateOpen(false);
              router.push("/live/start");
            }}
          />
        </div>
      )}

      {/* ===== BARRE DE NAVIGATION FIXE ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-neutral-800 safe-area-bottom">
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
          {/* Accueil */}
          <Link href="/" className={cn("flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1", pathname === "/" ? "text-white" : "text-neutral-400")}>
            <Home className={cn("w-6 h-6", pathname === "/" && "stroke-[2.5]")} />
            <span className="text-[10px] font-medium">Accueil</span>
          </Link>

          {/* Live (Réservé vendeurs) */}
          <button
            onClick={() => {
              if (!isSeller) {
                alert("Le Live est réservé aux vendeurs. Deviens vendeur pour lancer un Live Shopping !");
                return;
              }
              router.push("/live/start");
            }}
            className={cn("flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1", pathname === "/live" ? "text-white" : "text-neutral-400")}
          >
            <Radio className={cn("w-6 h-6", pathname === "/live" && "stroke-[2.5]")} />
            <span className="text-[10px] font-medium">Live</span>
          </button>

          {/* BOUTON CENTRAL TIKTOK */}
          <button
            onClick={() => setIsCreateOpen(true)}
            className="relative -top-3 flex flex-col items-center focus:outline-none"
          >
            <motion.div
              animate={{ rotate: isCreateOpen ? 45 : 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-[46px] h-[30px] rounded-[10px] bg-black flex items-center justify-center"
            >
              {/* Bordure gauche cyan */}
              <div className="absolute left-0 top-0 bottom-0 w-[8px] bg-[#25F4EE] rounded-l-[10px]" />
              {/* Bordure droite rouge */}
              <div className="absolute right-0 top-0 bottom-0 w-[8px] bg-[#FE2C55] rounded-r-[10px]" />
              {/* Centre noir avec le + */}
              <div className="relative z-10 w-[34px] h-[24px] bg-black rounded-[4px] flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" strokeWidth={3} />
              </div>
            </motion.div>
            <span className="text-[10px] font-medium text-white mt-0.5">Créer</span>
          </button>

          {/* Boutique */}
          <Link href="/shop" className={cn("flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1", pathname.startsWith("/shop") ? "text-white" : "text-neutral-400")}>
            <ShoppingBag className={cn("w-6 h-6", pathname.startsWith("/shop") && "stroke-[2.5]")} />
            <span className="text-[10px] font-medium">Boutique</span>
          </Link>

          {/* Profil */}
          <Link href="/profile/me" className={cn("flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1", pathname.startsWith("/profile") ? "text-white" : "text-neutral-400")}>
            <User className={cn("w-6 h-6", pathname.startsWith("/profile") && "stroke-[2.5]")} />
            <span className="text-[10px] font-medium">Profil</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
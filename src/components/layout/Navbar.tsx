"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Home, Radio, Plus, ShoppingBag, User, Store, X, Video, PackagePlus,
  Music, RefreshCw, Zap, ZapOff, Clock, LayoutGrid, Sparkles, ChevronDown,
  Upload, Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavbarProps {
  role?: string;
  sellerStatus?: string;
}

type Mode = "camera" | "create" | "live";
type Duration = 15 | 60 | 600 | "photo" | "text";

export default function Navbar({ role }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("camera");
  const [duration, setDuration] = useState<Duration>(15);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [flashOn, setFlashOn] = useState(false);
  const [timerOn, setTimerOn] = useState(false);
  const [gridOn, setGridOn] = useState(false);
  const [effectsOn, setEffectsOn] = useState(false);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textValue, setTextValue] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [recentVideos, setRecentVideos] = useState<any[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Charger l'utilisateur + ses vidéos récentes pour la rangée d'avatars
  useEffect(() => {
    if (!isCreateOpen) return;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsCreateOpen(false); router.push("/auth/login"); return; }
      setUserId(user.id);
      const { data } = await supabase
        .from("videos")
        .select("id, url")
        .eq("user_id", user.id)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentVideos(data || []);
    };
    load();
  }, [isCreateOpen, supabase, router]);

  // Démarrer / arrêter la caméra selon le mode
  useEffect(() => {
    if (!isCreateOpen || mode !== "camera") { stopCamera(); return; }
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateOpen, mode, facingMode]);

  // Fermer = arrêter l'enregistrement + la caméra
  useEffect(() => {
    if (!isCreateOpen) { stopRecording(); stopCamera(); setError(null); }
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

  function startRecording() {
    if (!streamRef.current) { setError("Active la caméra d'abord."); return; }
    setError(null);
    chunksRef.current = [];
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9" : "video/webm";
    const mr = new MediaRecorder(streamRef.current, { mimeType: mime });
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      await publishFile(blob, "webm", true);
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setRecording(true);

    if (typeof duration === "number") {
      let remaining = duration;
      setCountdown(remaining);
      const id = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) { clearInterval(id); stopRecording(); }
      }, 1000);
    }
  }

  // Logique d'upload IDENTIQUE à ton VideoUploadForm qui marche déjà
  const publishFile = useCallback(async (file: Blob, ext: string, isVideo: boolean, captionText?: string) => {
    if (!userId) return;
    setUploading(true); setError(null);
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
        .from("videos").upload(fileName, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("videos").getPublicUrl(fileName);

      const { error: dbErr } = await supabase.from("videos").insert({
        user_id: userId,
        url: urlData.publicUrl,
        caption: (captionText ?? "").trim() || null,
        is_public: true,
        status: "published",
        view_count: 0, like_count: 0, comment_count: 0,
        duration_seconds: durationSeconds,
      });
      if (dbErr) throw dbErr;

      stopCamera();
      setIsCreateOpen(false);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Erreur lors de la publication.");
    } finally {
      setUploading(false);
    }
  }, [userId, router]);

  // Bouton rouge central : comportement selon mode/durée
  function handleRecordButton() {
    if (uploading) return;
    if (mode === "live") { stopCamera(); setIsCreateOpen(false); router.push("/live/start"); return; }
    if (mode === "create") { fileInputRef.current?.click(); return; }
    if (duration === "photo") { photoInputRef.current?.click(); return; }
    if (duration === "text") {
      if (!textValue.trim()) { setError("Écris ton texte d'abord."); return; }
      generateTextImage(textValue); return;
    }
    // mode caméra + durée numérique
    if (recording) stopRecording(); else startRecording();
  }

  function onVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    publishFile(f, f.name.split(".").pop() || "mp4", true);
  }
  function onPhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    publishFile(f, f.name.split(".").pop() || "jpg", false);
  }

  function generateTextImage(text: string) {
    const c = document.createElement("canvas");
    c.width = 1080; c.height = 1920;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "bold 72px sans-serif";
    wrapText(ctx, text, c.width / 2, c.height / 2, c.width - 160, 90);
    c.toBlob((blob) => { if (blob) publishFile(blob, "png", false, text); }, "image/png");
  }
  function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
    const words = text.split(" "); let line = ""; const lines: string[] = [];
    for (const w of words) {
      const test = line + w + " ";
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w + " "; } else line = test;
    }
    lines.push(line);
    const total = lines.length * lh;
    lines.forEach((l, i) => ctx.fillText(l, x, y - total / 2 + lh / 2 + i * lh));
  }

  const links = [
    { href: "/", label: "Accueil", icon: Home },
    { href: "/live", label: "Live", icon: Radio },
    { href: "/shop", label: "Boutique", icon: ShoppingBag },
    ...(role === "seller" ? [{ href: "/seller/dashboard", label: "Vendeur", icon: Store }] : []),
    { href: "/profile/me", label: "Profil", icon: User },
  ];

  const durations: { key: Duration; label: string }[] = [
    { key: 600, label: "10 min" }, { key: 60, label: "60 s" }, { key: 15, label: "15 s" },
    { key: "photo", label: "PHOTO" }, { key: "text", label: "TEXTE" },
  ];

  return (
    <>
      {/* ===== ÉCRAN DE CRÉATION (remplace l'ancien petit menu) ===== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-[60] bg-black text-white flex flex-col">
          {/* Inputs cachés */}
          <input ref={fileInputRef} type="file" accept="video/*" onChange={onVideoFile} className="hidden" />
          <input ref={photoInputRef} type="file" accept="image/*" onChange={onPhotoFile} className="hidden" />

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <button onClick={() => setIsCreateOpen(false)} className="p-2"><X className="w-7 h-7" /></button>
            <button onClick={() => { setIsCreateOpen(false); router.push("/sounds"); }}
              className="flex items-center gap-2 bg-neutral-800/70 px-4 py-2 rounded-full text-sm font-medium">
              <Music className="w-4 h-4" /> Ajouter un son
            </button>
            <div className="flex flex-col items-center gap-1">
              <button onClick={() => setFacingMode((f) => (f === "user" ? "environment" : "user"))} className="p-2"><RefreshCw className="w-6 h-6" /></button>
              <button onClick={() => setFlashOn((v) => !v)} className="p-2">{flashOn ? <Zap className="w-6 h-6 text-yellow-400" /> : <ZapOff className="w-6 h-6" />}</button>
              <div className="w-8 border-t border-neutral-700 my-1" />
              <button onClick={() => setTimerOn((v) => !v)} className={cn("p-2", timerOn && "text-red-500")}><Clock className="w-6 h-6" /></button>
              <button onClick={() => setGridOn((v) => !v)} className={cn("p-2", gridOn && "text-red-500")}><LayoutGrid className="w-6 h-6" /></button>
              <button onClick={() => setEffectsOn((v) => !v)} className={cn("p-2", effectsOn && "text-red-500")}><Sparkles className="w-6 h-6" /></button>
              <button onClick={() => { setMode("live"); }} className="p-2"><Radio className="w-6 h-6" /></button>
              <button onClick={() => setIsCreateOpen(false)} className="p-2"><ChevronDown className="w-6 h-6" /></button>
            </div>
          </div>

          {/* Zone centrale caméra / aperçu */}
          <div className="relative flex-1 mx-auto w-full max-w-md overflow-hidden">
            {mode === "camera" ? (
              <video ref={videoRef} autoPlay playsInline muted
                className={cn("absolute inset-0 w-full h-full object-cover",
                  facingMode === "user" && "scale-x-[-1]", effectsOn && "grayscale")} />
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
            {timerOn && typeof duration === "number" && countdown !== null && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-5xl font-bold text-red-500 drop-shadow">{countdown}</div>
            )}
            {error && (
              <div className="absolute bottom-4 left-4 right-4 bg-red-600/90 text-white text-sm px-4 py-2 rounded-lg">{error}</div>
            )}

            {duration === "text" && (
              <textarea value={textValue} onChange={(e) => setTextValue(e.target.value)}
                placeholder="Écris ton texte..."
                className="absolute inset-x-8 top-1/2 -translate-y-1/2 bg-neutral-900/80 border border-neutral-700 rounded-xl p-4 text-white outline-none h-40 resize-none" />
            )}
          </div>

          {/* Sélecteur de durée */}
          <div className="flex items-center justify-center gap-5 py-3">
            {durations.map((d) => (
              <button key={String(d.key)} onClick={() => { setDuration(d.key); setMode("camera"); }}
                className={cn("text-sm font-semibold px-3 py-1 rounded-full transition",
                  duration === d.key ? "bg-white text-black" : "text-neutral-400")}>
                {d.label}
              </button>
            ))}
          </div>

          {/* Rangée avatars récents + bouton rouge */}
          <div className="flex items-center justify-center gap-3 px-4 pb-2">
            {recentVideos.slice(0, 2).map((v) => (
              <button key={v.id} onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-full overflow-hidden border border-neutral-700">
                <img src={v.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
            <button onClick={handleRecordButton} disabled={uploading}
              className="relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition disabled:opacity-60">
              <div className={cn("w-16 h-16 rounded-full transition", recording ? "bg-white" : "bg-red-500")} />
              {uploading && <div className="absolute inset-0 flex items-center justify-center"><div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
            </button>
            {recentVideos.slice(2, 5).map((v) => (
              <button key={v.id} onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-full overflow-hidden border border-neutral-700">
                <img src={v.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {/* Footer LIVE / CAMÉRA / CRÉER + galerie */}
          <div className="flex items-center justify-between px-6 pb-6 pt-2">
            <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded border border-neutral-600 overflow-hidden">
              <img src={recentVideos[0]?.url} alt="" className="w-full h-full object-cover" />
            </button>
            <div className="flex items-center gap-8">
              {(["live", "camera", "create"] as Mode[]).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className={cn("text-sm font-bold tracking-wide uppercase transition", mode === m ? "text-white" : "text-neutral-500")}>
                  {m === "camera" ? "CAMÉRA" : m === "create" ? "CRÉER" : "LIVE"}
                </button>
              ))}
            </div>
            <button onClick={() => photoInputRef.current?.click()} className="w-10 h-10 rounded border border-neutral-600 flex items-center justify-center">
              <Mic className="w-5 h-5 text-neutral-400" />
            </button>
          </div>
        </div>
      )}

      {/* ===== BARRE DE NAVIGATION ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur border-t border-neutral-800 safe-area-bottom">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {links.slice(0, 2).map((link) => {
            const Icon = link.icon;
            const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href}
                className={cn("flex flex-col items-center justify-center gap-0.5 min-w-[60px] py-1", isActive ? "text-red-500" : "text-neutral-400")}>
                <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5]")} />
                <span className="text-[10px] font-medium">{link.label}</span>
              </Link>
            );
          })}

          {/* BOUTON CENTRAL (+) */}
          <button onClick={() => setIsCreateOpen((v) => !v)} className="relative -top-4 flex flex-col items-center focus:outline-none">
            <div className={cn("w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition",
              isCreateOpen ? "bg-neutral-700 rotate-45" : "bg-gradient-to-r from-cyan-400 via-white to-red-500 shadow-red-500/30")}>
              <div className="w-11 h-11 rounded-full bg-black flex items-center justify-center">
                <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>
            </div>
          </button>

          {links.slice(2).map((link) => {
            const Icon = link.icon;
            const isActive = pathname.startsWith(link.href);
            return (
              <Link key={link.href} href={link.href}
                className={cn("flex flex-col items-center justify-center gap-0.5 min-w-[60px] py-1", isActive ? "text-red-500" : "text-neutral-400")}>
                <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5]")} />
                <span className="text-[10px] font-medium">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

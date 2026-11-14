"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X, RefreshCw, Zap, ZapOff, Timer, LayoutGrid, Sparkles, Captions,
  Music2, ImagePlus, Radio, Wand2, Square, RotateCcw,
  Settings2, Smartphone, Clapperboard, Bookmark
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Tab = "LIVE" | "CAMÉRA" | "CRÉER";
type CaptureMode = "10 min" | "60 s" | "15 s" | "PHOTO" | "TEXTE";

export default function CreatePage() {
  const router = useRouter();
  const supabase = createClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const galleryRef = useRef<HTMLInputElement>(null);
  
  const [tab, setTab] = useState<Tab>("CRÉER"); // On démarre sur CRÉER par défaut
  const [mode, setMode] = useState<CaptureMode>("15 s");
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [flash, setFlash] = useState(false);
  const [timer, setTimer] = useState(false);
  const [grid, setGrid] = useState(false);
  const [beauty, setBeauty] = useState(false);
  const [teleprompter, setTeleprompter] = useState(false);
  const [filter, setFilter] = useState(false);
  const [format, setFormat] = useState(false);
  const [drafts, setDrafts] = useState<string[]>([]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("La caméra nécessite HTTPS et un navigateur compatible.");
      return;
    }
    stopCamera();
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: true,
      });
      streamRef.current = media;
      if (videoRef.current) {
        videoRef.current.srcObject = media;
        await videoRef.current.play().catch(() => undefined);
      }
    } catch {
      setError("Autorise l'accès à la caméra et au microphone.");
    }
  }, [facing, stopCamera]);

  useEffect(() => {
    if ((tab === "CAMÉRA" || tab === "LIVE") && !previewUrl) void startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [tab, facing, previewUrl, startCamera, stopCamera]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("moshi-creator-drafts") || "[]");
      if (Array.isArray(saved)) setDrafts(saved);
    } catch {}
  }, []);

  const setMedia = (file: File) => {
    if (!file.type.startsWith("video/") && !file.type.startsWith("image/")) {
      setError("Choisis une photo ou une vidéo.");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError("Le fichier dépasse la limite de 100 Mo.");
      return;
    }
    stopCamera();
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError("");
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `moshi-photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(blob));
      stopCamera();
    }, "image/jpeg", 0.92);
  };

  const beginRecording = () => {
    if (mode === "PHOTO") {
      capturePhoto();
      return;
    }
    if (mode === "TEXTE") {
      const message = window.prompt("Écris ton texte Moshi :");
      if (message?.trim()) {
        const canvas = document.createElement("canvas");
        canvas.width = 1080; canvas.height = 1920;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#101010"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.font = "bold 64px sans-serif";
        const words = message.trim().split(/\s+/); let line = ""; let y = 900;
        for (const word of words) {
          const next = line ? `${line} ${word}` : word;
          if (ctx.measureText(next).width > 900 && line) { ctx.fillText(line, 540, y); y += 82; line = word; }
          else line = next;
        }
        if (line) ctx.fillText(line, 540, y);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const file = new File([blob], `moshi-texte-${Date.now()}.png`, { type: "image/png" });
          setSelectedFile(file); setPreviewUrl(URL.createObjectURL(blob)); stopCamera();
        }, "image/png");
      }
      return;
    }
    const stream = streamRef.current;
    if (!stream) {
      setError("La caméra n'est pas encore prête.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError("L'enregistrement vidéo n'est pas pris en charge.");
      return;
    }
    const mime = ["video/mp4;codecs=h264,aac", "video/webm;codecs=vp9,opus", "video/webm"]
      .find((type) => MediaRecorder.isTypeSupported(type));
    try {
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        setSelectedFile(new File([blob], `moshi-${Date.now()}.${blob.type.includes("mp4") ? "mp4" : "webm"}`, { type: blob.type }));
        setPreviewUrl(URL.createObjectURL(blob));
        stopCamera();
      };
      recorder.start(250);
      recorderRef.current = recorder;
      setRecording(true);
      setError("");
      if (mode === "15 s" || mode === "60 s" || mode === "10 min") {
        const duration = mode === "15 s" ? 15000 : mode === "60 s" ? 60000 : 600000;
        window.setTimeout(() => {
          if (recorder.state === "recording") {
            recorder.stop();
            setRecording(false);
          }
        }, duration);
      }
    } catch {
      setError("Impossible de démarrer l'enregistrement.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
  };

  const resetCapture = () => {
    if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setSelectedFile(null);
    setCaption("");
    setError("");
    setNotice("");
  };

  const saveDraft = () => {
    if (!selectedFile) {
      setNotice("Enregistre ou importe un média avant de créer un brouillon.");
      return;
    }
    const entry = `${selectedFile.name} · ${new Date().toLocaleString("fr-FR")}`;
    const next = [entry, ...drafts].slice(0, 20);
    setDrafts(next);
    localStorage.setItem("moshi-creator-drafts", JSON.stringify(next));
    setNotice("Brouillon enregistré sur cet appareil.");
  };

  const publish = async () => {
    if (!selectedFile || !selectedFile.type.startsWith("video/")) {
      setError("Sélectionne une vidéo pour la publier.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push("/auth/login");
        return;
      }
      const ext = selectedFile.name.split(".").pop() || "webm";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("videos").upload(path, selectedFile, {
        cacheControl: "3600", upsert: false, contentType: selectedFile.type,
      });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("videos").getPublicUrl(path);
      const { error: insertError } = await supabase.from("videos").insert({
        user_id: user.id, url: urlData.publicUrl, caption: caption.trim(),
        is_public: true, status: "published", view_count: 0, like_count: 0, comment_count: 0,
      });
      if (insertError) throw insertError;
      router.push("/");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "La publication a échoué.");
      setBusy(false);
    }
  };

  return (
    <main className="fixed inset-0 z-[70] flex flex-col bg-black text-white">
      {tab === "CAMÉRA" && (
        <section className="relative min-h-0 flex-1 overflow-hidden bg-neutral-950">
          {!previewUrl ? (
            <>
              <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 h-full w-full object-cover ${facing === "user" ? "scale-x-[-1]" : ""}`} />
              {grid && <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">{Array.from({length: 4}).map((_,i)=><i key={i} className="border-r border-white/40" />)}</div>}
              
              <header className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-4 pt-5">
                <button onClick={() => router.back()} aria-label="Fermer" className="rounded-full bg-black/30 p-2"><X size={24}/></button>
                <button onClick={() => setNotice("Sélection du son : importe un fichier audio.")} className="rounded-full bg-black/40 px-4 py-2 text-sm font-semibold"><Music2 className="mr-2 inline" size={16}/>Ajouter un son</button>
                <button onClick={() => setFacing(facing === "user" ? "environment" : "user")} aria-label="Retourner la caméra" className="rounded-full bg-black/30 p-2"><RefreshCw size={22}/></button>
              </header>

              <div className="absolute right-3 top-24 z-20 flex flex-col gap-4">
                <button onClick={async () => {
                  const track = streamRef.current?.getVideoTracks()[0];
                  if (!track) { setNotice("La caméra n'est pas prête."); return; }
                  const capabilities = track.getCapabilities?.() as any;
                  if (!capabilities?.torch) { setNotice("Le flash n'est pas pris en charge."); return; }
                  try { await track.applyConstraints({ advanced: [{ torch: !flash } as any] }); setFlash(!flash); }
                  catch { setNotice("Impossible de commander le flash."); }
                }} title="Flash">{flash ? <Zap className="h-6 w-6"/> : <ZapOff className="h-6 w-6"/>}</button>
                <button onClick={() => setTimer(!timer)} title="Minuteur"><Timer className="h-6 w-6"/></button>
                <button onClick={() => setGrid(!grid)} title="Disposition"><LayoutGrid className="h-6 w-6"/></button>
                <button onClick={() => setBeauty(!beauty)} title="Retouche"><Sparkles className={`h-6 w-6 ${beauty ? "text-pink-400" : ""}`}/></button>
                <button onClick={() => setTeleprompter(!teleprompter)} title="Téléprompteur"><Captions className={`h-6 w-6 ${teleprompter ? "text-pink-400" : ""}`}/></button>
                <button onClick={() => setFilter(!filter)} title="Filtres"><Wand2 className={`h-6 w-6 ${filter ? "text-pink-400" : ""}`}/></button>
                <button onClick={() => setFormat(!format)} title="Format"><Smartphone className="h-6 w-6"/></button>
              </div>

              {teleprompter && <div className="absolute left-5 right-20 top-28 rounded-xl bg-black/55 p-3 text-sm">Ton texte de téléprompteur apparaîtra ici.</div>}

              <div className="absolute bottom-5 left-0 right-0 z-20">
                <div className="mb-4 flex items-center justify-center gap-3 overflow-x-auto px-3 text-xs font-bold">
                  {(["10 min","60 s","15 s","PHOTO","TEXTE"] as CaptureMode[]).map((m)=><button key={m} onClick={()=>setMode(m)} className={`whitespace-nowrap rounded-full px-3 py-1 ${mode===m?"bg-white text-black":"text-white"}`}>{m}</button>)}
                </div>
                <div className="flex items-center justify-between px-6">
                  <button onClick={()=>galleryRef.current?.click()} aria-label="Ouvrir la galerie" className="h-12 w-12 overflow-hidden rounded-full border border-white/50 bg-black/40"><ImagePlus className="mx-auto" size={20}/></button>
                  <button onClick={recording?stopRecording:beginRecording} aria-label={recording?"Arrêter":mode === "PHOTO" ? "Prendre une photo" : "Enregistrer"} className="flex h-20 w-20 items-center justify-center rounded-full border-[4px] border-white bg-white/15 shadow-xl">
                    {recording?<Square className="h-8 w-8 fill-rose-500 text-rose-500"/>:<span className="h-14 w-14 rounded-full bg-[#fe2c55]"/>}
                  </button>
                  <button onClick={()=>setNotice("Effets favoris : à venir.")} aria-label="Effets" className="h-12 w-12 rounded-full bg-black/40"><Sparkles className="mx-auto" size={20}/></button>
                </div>
                {recording && <p className="mt-2 text-center text-xs font-semibold text-rose-400">Enregistrement en cours</p>}
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col">
              {selectedFile?.type.startsWith("video/") ? <video src={previewUrl} controls playsInline className="min-h-0 flex-1 bg-black object-contain"/> : <img src={previewUrl} alt="Aperçu" className="min-h-0 flex-1 object-contain"/>}
              <div className="space-y-3 bg-neutral-950 p-4 pb-8">
                <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Aperçu</h2><button onClick={resetCapture} className="rounded-full p-2"><RotateCcw/></button></div>
                <textarea value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Ajouter une description…" className="w-full rounded-xl border border-neutral-700 bg-neutral-900 p-3 text-sm outline-none focus:border-pink-500"/>
                <div className="flex gap-3"><button onClick={saveDraft} className="flex-1 rounded-xl border border-neutral-700 py-3 font-semibold"><Bookmark className="mr-2 inline h-4 w-4"/>Brouillon</button><button onClick={publish} disabled={busy} className="flex-1 rounded-xl bg-[#fe2c55] py-3 font-bold disabled:opacity-50">{busy?"Publication…":"Publier"}</button></div>
              </div>
            </div>
          )}
          <input ref={galleryRef} type="file" accept="video/*,image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)setMedia(f);e.currentTarget.value="";}}/>
          {error && <div className="absolute left-4 right-4 top-20 z-40 rounded-xl bg-red-600/95 p-3 text-sm">{error}</div>}
          {notice && <button onClick={()=>setNotice("")} className="absolute left-4 right-4 top-20 z-40 rounded-xl bg-neutral-900/95 p-3 text-left text-sm">{notice} <span className="float-right">×</span></button>}
        </section>
      )}

      {tab === "LIVE" && (
        <section className="relative min-h-0 flex-1 overflow-hidden bg-neutral-950">
          <div className="absolute inset-0">
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover opacity-70"/>
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"/>
          </div>
          <header className="relative z-10 flex items-center justify-between p-5">
            <button onClick={()=>router.back()}><X size={24}/></button>
            <span className="rounded-full bg-black/40 px-4 py-2 text-sm font-bold">LIVE</span>
            <button onClick={()=>setNotice("Paramètres LIVE.")}><Settings2 size={24}/></button>
          </header>
          <div className="absolute inset-x-5 bottom-16 z-10 space-y-6">
            <input value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Ajouter un titre" className="w-full rounded-xl bg-black/45 p-3 text-sm outline-none placeholder:text-neutral-300"/>
            <button onClick={()=>router.push("/live/start")} className="w-full rounded-full bg-[#fe2c55] py-4 text-base font-extrabold">Passer en LIVE</button>
          </div>
        </section>
      )}

      {tab === "CRÉER" && (
        <section className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-4">
          <header className="mb-7 flex items-center justify-between"><button onClick={()=>router.back()} aria-label="Fermer"><X size={24}/></button><h1 className="text-2xl font-extrabold tracking-wide">CRÉER</h1><span className="w-7"/></header>
          
          {/* ✅ SEULEMENT 2 GROS BOUTONS UTILES */}
          <div className="mb-8 grid grid-cols-[1fr_112px] gap-3">
            <button onClick={()=>setTab("CAMÉRA")} className="flex min-h-32 flex-col items-center justify-center rounded-2xl bg-gradient-to-r from-orange-100 to-cyan-100 text-black">
              <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-black text-white"><PlusIcon/></span>
              <span className="text-lg font-extrabold">Nouvelle vidéo</span>
            </button>
            <button onClick={()=>setNotice(drafts.length?`Brouillons : ${drafts.join(" | ")}`:"Aucun brouillon.")} className="flex flex-col items-center justify-center rounded-2xl bg-neutral-900">
              <Bookmark size={24}/>
              <span className="mt-2 font-bold text-sm">Brouillons</span>
              <span className="text-xs text-neutral-400">{drafts.length}</span>
            </button>
          </div>

          {/* ✅ SEULEMENT L'IMPORT DE MÉDIA (utile) */}
          <div className="grid grid-cols-1 gap-3">
            <button onClick={()=>galleryRef.current?.click()} className="flex items-center gap-4 rounded-2xl bg-neutral-900 p-4 text-left active:scale-[0.98] transition">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-neutral-800"><ImagePlus size={24}/></div>
              <div>
                <p className="font-bold text-sm">Importer un média</p>
                <p className="text-xs text-neutral-400">Depuis ton appareil</p>
              </div>
            </button>
          </div>

          <input ref={galleryRef} type="file" accept="video/*,image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f){setMedia(f);setTab("CAMÉRA");}e.currentTarget.value="";}}/>
          {notice && <button onClick={()=>setNotice("")} className="mt-4 w-full rounded-xl bg-neutral-900 p-3 text-left text-sm">{notice} <span className="float-right">×</span></button>}
        </section>
      )}

      <nav className="z-30 flex h-[64px] shrink-0 items-center justify-around border-t border-neutral-900 bg-black px-6 pb-2">
        <button onClick={()=>setTab("LIVE")} className={`text-sm font-extrabold ${tab==="LIVE"?"text-white":"text-neutral-500"}`}>LIVE</button>
        <button onClick={()=>setTab("CAMÉRA")} className={`text-sm font-extrabold ${tab==="CAMÉRA"?"text-white":"text-neutral-500"}`}>CAMÉRA</button>
        <button onClick={()=>setTab("CRÉER")} className={`text-sm font-extrabold ${tab==="CRÉER"?"text-white":"text-neutral-500"}`}>CRÉER</button>
      </nav>
    </main>
  );
}

function PlusIcon() {
  return <span className="text-2xl leading-none">+</span>;
}
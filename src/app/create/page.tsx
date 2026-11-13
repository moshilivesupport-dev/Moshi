"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Camera, RefreshCw, Zap, ZapOff, Circle, Square } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function CreatePage() {
  const router = useRouter();
  const supabase = createClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [flashOn, setFlashOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Démarrer la caméra
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true,
      });
      setStream(mediaStream);
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError("Impossible d'accéder à la caméra");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const toggleRecording = () => {
    if (recording) {
      // Arrêter l'enregistrement
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      setRecording(false);
    } else {
      // Démarrer l'enregistrement
      if (!streamRef.current) return;
      chunksRef.current = [];
      const recorder = new MediaRecorder(streamRef.current, { mimeType: "video/webm" });
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        uploadVideo(blob);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    }
  };

  const uploadVideo = async (blob: Blob) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const fileName = `${user.id}/${Date.now()}.webm`;
      const { error: upError } = await supabase.storage.from("videos").upload(fileName, blob);
      if (upError) throw upError;

      const { data: urlData } = supabase.storage.from("videos").getPublicUrl(fileName);
      
      const { error: dbError } = await supabase.from("videos").insert({
        user_id: user.id,
        url: urlData.publicUrl,
        caption: "",
        is_public: true,
        status: "published",
        view_count: 0, like_count: 0, comment_count: 0,
      });
      if (dbError) throw dbError;

      router.push("/");
    } catch (err) {
      setError("Erreur lors de la publication");
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black">
      {/* Caméra */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 flex items-center justify-between">
        <button onClick={() => { stopCamera(); router.back(); }} className="p-2">
          <X className="w-7 h-7 text-white" />
        </button>
        <div className="flex gap-4">
          <button onClick={() => setFlashOn(!flashOn)} className="p-2">
            {flashOn ? <Zap className="w-6 h-6 text-yellow-400" /> : <ZapOff className="w-6 h-6 text-white" />}
          </button>
          <button onClick={() => setFacingMode(facingMode === "user" ? "environment" : "user")} className="p-2">
            <RefreshCw className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="absolute top-20 left-4 right-4 z-30 bg-red-600 text-white p-3 rounded-lg text-sm text-center">
          {error}
        </div>
      )}

      {/* Bouton d'enregistrement */}
      <div className="absolute bottom-10 left-0 right-0 z-30 flex flex-col items-center">
        {uploading ? (
          <div className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <button
            onClick={toggleRecording}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-black/30"
          >
            {recording ? (
              <Square className="w-8 h-8 text-red-500 fill-red-500" />
            ) : (
              <Circle className="w-8 h-8 text-white fill-white" />
            )}
          </button>
        )}
        <p className="text-white text-xs mt-3">
          {recording ? "Appuyez pour arrêter" : "Appuyez pour enregistrer"}
        </p>
      </div>
    </div>
  );
}
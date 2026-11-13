"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { X, Camera, Video, Plus, Loader2 } from "lucide-react";

export default function LiveCreatePage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartLive = async () => {
    setStarting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non connecté");

      // Créer le live en base
      const { data: liveData, error: liveError } = await supabase
        .from("live_sessions")
        .insert({
          host_id: user.id,
          title: title.trim() || "Mon live",
          host_role: "acheteur", // Acheteur
          status: "live",
          viewers_count: 0,
          product_ids: [],
          room_name: `moshi-live-${crypto.randomUUID()}`,
          provider: "livekit",
        })
        .select()
        .single();

      if (liveError) throw liveError;

      // Redirection directe vers le live
      router.push(`/live/${liveData.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur";
      setError(message);
      setStarting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col">
      {/* Header avec bouton fermer */}
      <div className="flex items-center justify-between px-4 py-4">
        <button onClick={() => router.back()} className="p-2">
          <X className="w-6 h-6" />
        </button>
        <h1 className="text-sm font-semibold">Live</h1>
        <div className="w-10" />
      </div>

      {/* Zone d'aperçu caméra (placeholder) */}
      <div className="flex-1 bg-neutral-900 flex items-center justify-center relative mx-4 rounded-2xl overflow-hidden">
        <div className="flex flex-col items-center gap-3 text-neutral-600">
          <Camera className="w-12 h-12" />
          <p className="text-sm">Aperçu de la caméra</p>
        </div>
      </div>

      {/* Outils sous la caméra (comme sur ta capture 1) */}
      <div className="px-4 py-4">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          <div className="flex flex-col items-center gap-1 min-w-[60px]">
            <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-neutral-400">Caméra</span>
          </div>
          <div className="flex flex-col items-center gap-1 min-w-[60px]">
            <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-neutral-400">Sondage</span>
          </div>
          {/* ... autres outils */}
        </div>
      </div>

      {/* Champ de titre + bouton Lancer */}
      <div className="px-4 pb-8 space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ajouter un titre"
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-white text-sm focus:ring-2 focus:ring-red-500 outline-none"
        />
        
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleStartLive}
          disabled={starting}
          className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-4 rounded-full transition flex items-center justify-center gap-2"
        >
          {starting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Lancement...
            </>
          ) : (
            "Passer en LIVE"
          )}
        </button>
      </div>
    </div>
  );
}
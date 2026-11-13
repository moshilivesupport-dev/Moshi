"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, Camera } from "lucide-react";

export default function NewStoryPage() {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col">
      <header className="flex items-center gap-2 px-2 py-3">
        <button onClick={() => router.back()} className="p-2">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-semibold">Nouvelle Story</h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Camera className="w-16 h-16 text-neutral-700" />
        <h2 className="text-white font-semibold text-lg">Créer une story</h2>
        <p className="text-neutral-400 text-sm">
          Prends une photo ou une vidéo qui disparaîtra dans 24h.
        </p>
        <button 
          onClick={() => alert("Fonctionnalité de story bientôt disponible !")}
          className="mt-4 px-6 py-3 bg-red-500 text-white rounded-full font-semibold"
        >
          Ouvrir l'appareil photo
        </button>
      </div>
    </div>
  );
}
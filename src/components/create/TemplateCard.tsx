"use client";

import { Play } from "lucide-react";

interface TemplateCardProps {
  id: string;
  thumbnailUrl: string;
  title: string;
  usageCount: number;
  clipCount?: number;
}

export default function TemplateCard({
  id,
  thumbnailUrl,
  title,
  usageCount,
  clipCount,
}: TemplateCardProps) {
  return (
    <button
      onClick={() => {
        // TODO : Rediriger vers l'écran caméra avec ce modèle pré-sélectionné
        console.log("Utiliser modèle:", id);
      }}
      className="relative flex-shrink-0 w-40 aspect-[9/16] rounded-xl overflow-hidden bg-neutral-900 group"
    >
      <img
        src={thumbnailUrl}
        alt={title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
      />
      
      {/* Overlay sombre en bas */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent" />
      
      {/* Icône Play */}
      <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
        <Play className="w-3.5 h-3.5 text-white fill-white" />
      </div>
      
      {/* Texte */}
      <div className="absolute bottom-2 left-2 right-2">
        <p className="text-xs font-bold text-white line-clamp-1">{title}</p>
        <p className="text-[10px] text-neutral-300 mt-0.5">
          {usageCount.toLocaleString("fr-FR")} vidéos
          {clipCount && ` · ${clipCount} clips`}
        </p>
      </div>
    </button>
  );
}
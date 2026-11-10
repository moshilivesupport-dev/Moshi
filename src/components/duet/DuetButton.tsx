"use client";

import Link from "next/link";
import { Split } from "lucide-react";

interface DuetButtonProps {
  videoId: string;
  mode?: "duet" | "stitch";
}

/**
 * Duet / Stitch
 * - Duet : vidéo originale à côté de la nouvelle
 * - Stitch : extrait de l'originale puis ta vidéo
 *
 * L'enregistrement réel se fait sur /videos/new?duet=ID ou ?stitch=ID
 * Le schéma SQL (duet_from_id / stitch_from_id) est déjà prêt.
 */
export default function DuetButton({ videoId, mode = "duet" }: DuetButtonProps) {
  const href =
    mode === "stitch"
      ? `/videos/new?stitch=${videoId}`
      : `/videos/new?duet=${videoId}`;

  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
        <Split className="w-5 h-5 text-white" />
      </div>
      <span className="text-xs text-white font-medium capitalize">{mode}</span>
    </Link>
  );
}

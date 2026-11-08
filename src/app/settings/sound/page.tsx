"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Soundboard } from "@/components/soundboard/Soundboard";
import { useSoundboard } from "@/hooks/useSoundboard";

export default function SoundSettingsPage() {
  const { trigger } = useSoundboard(null);

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-muted hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> Paramètres
      </Link>
      <h1 className="text-xl font-bold text-white mb-2">Sons & Soundboard</h1>
      <p className="text-sm text-muted mb-6">
        Prévisualisez les effets. Pendant un live, utilisez le mixer pour les injecter dans le stream LiveKit.
      </p>
      <Soundboard onTrigger={trigger} />
    </div>
  );
}

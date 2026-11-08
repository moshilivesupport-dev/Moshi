"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Copy, Users, Coins } from "lucide-react";

export default function AffiliatePage() {
  const [code] = useState("MOSHI-" + Math.random().toString(36).slice(2, 8).toUpperCase());
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(`https://moshi.app/r/${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
        <Users className="w-6 h-6 text-coral" /> Programme d’affiliation
      </h1>
      <p className="text-muted text-sm mb-8">
        Invitez vos amis et gagnez des coins à chaque inscription et premier achat.
      </p>

      <div className="card text-center py-8 mb-6">
        <p className="text-xs text-muted mb-2">Votre code</p>
        <p className="text-2xl font-bold text-champagne tracking-wider">{code}</p>
        <Button size="sm" variant="outline" className="mt-4" onClick={copy}>
          <Copy className="w-4 h-4 mr-1.5" /> {copied ? "Copié !" : "Copier le lien"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <Coins className="w-6 h-6 text-champagne mx-auto mb-2" />
          <p className="text-xl font-bold text-white">0</p>
          <p className="text-xs text-muted">Coins gagnés</p>
        </div>
        <div className="card text-center">
          <Users className="w-6 h-6 text-coral mx-auto mb-2" />
          <p className="text-xl font-bold text-white">0</p>
          <p className="text-xs text-muted">Filleuls</p>
        </div>
      </div>
    </div>
  );
}

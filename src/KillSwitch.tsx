"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

interface Props {
  streamId: string;
  onKilled?: () => void;
}

export function KillSwitch({ streamId, onKilled }: Props) {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const supabase = createClient();

  const kill = async () => {
    setLoading(true);
    try {
      await supabase
        .from("live_streams")
        .update({
          status: "killed",
          ended_at: new Date().toISOString(),
        })
        .eq("id", streamId);
      onKilled?.();
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  };

  if (!confirm) {
    return (
      <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
        <AlertTriangle className="w-4 h-4 mr-1.5" /> Kill Switch
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
      <span className="text-sm text-red-300">Confirmer l&apos;arrêt forcé ?</span>
      <Button size="sm" variant="danger" loading={loading} onClick={kill}>
        Oui, arrêter
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>
        Annuler
      </Button>
    </div>
  );
}

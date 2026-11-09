"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Radio } from "lucide-react";
import { Soundboard } from "@/components/soundboard/Soundboard";
import { useSoundboard } from "@/hooks/useSoundboard";
import { GuestMode } from "@/components/guest/GuestMode";
import { createClient } from "@/lib/supabase/client";

export default function SellerGoLivePage() {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { trigger } = useSoundboard(null);
  const router = useRouter();
  const supabase = createClient();

  const startLive = async () => {
    if (!title.trim()) return;
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    // Termine un éventuel live resté ouvert
    await supabase
      .from("live_streams")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("seller_id", user.id)
      .eq("status", "live");

    const { data, error: insertError } = await supabase
      .from("live_streams")
      .insert({
        seller_id: user.id,
        title: title.trim(),
        status: "live",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !data) {
      setError(insertError?.message || "Impossible de démarrer le live.");
      setLoading(false);
      return;
    }
    setStreamId(data.id);
    setIsLive(true);
    setLoading(false);
  };

  const stopLive = async () => {
    if (streamId) {
      await supabase
        .from("live_streams")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", streamId);
    }
    setIsLive(false);
    setStreamId(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
        <Radio className="w-6 h-6 text-coral" /> Passer en live
      </h1>
      <p className="text-muted text-sm mb-8">
        Configurez votre stream. Soundboard et invités disponibles pendant le live.
      </p>

      {!isLive ? (
        <div className="card space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Titre du live</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Nouveautés mode – Flash sale"
              className="input-field"
            />
          </div>
          <div className="rounded-xl bg-onyx border border-white/10 p-6 text-center text-muted text-sm">
            Zone preview caméra / LiveKit
            <br />
            <span className="text-xs">(Diffusion vidéo à brancher : LiveKit / Mux / Agora)</span>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button className="w-full" variant="primary" loading={loading} disabled={!title.trim()} onClick={startLive}>
            <Radio className="w-4 h-4 mr-2" /> Démarrer le live
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card border-coral/30 flex items-center justify-between">
            <div>
              <span className="px-2 py-0.5 bg-coral rounded text-[10px] font-bold text-white animate-pulse">LIVE</span>
              <p className="text-sm font-medium text-white mt-1">{title}</p>
              {streamId && (
                <Link href={`/live/${streamId}`} className="text-xs text-coral hover:underline">
                  Voir la page du live
                </Link>
              )}
            </div>
            <Button size="sm" variant="danger" onClick={stopLive}>Arrêter</Button>
          </div>

          <Soundboard onTrigger={trigger} />
          <GuestMode isHost guests={[]} />
        </div>
      )}
    </div>
  );
}

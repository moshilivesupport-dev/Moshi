import { ReplayPlayer } from "@/components/replay/ReplayPlayer";

export default function ReplayPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Replays</h1>
      <ReplayPlayer
        title="Live Mode – 28 Octobre"
        duration={3720}
        highlights={[
          { t: 420, type: "gift", label: "Super Moshi Star x5" },
          { t: 890, type: "sale", label: "12 ventes en 1 min" },
          { t: 1500, type: "peak", label: "Pic 1 200 viewers" },
          { t: 2100, type: "gift", label: "Crown offert" },
        ]}
      />
    </div>
  );
}

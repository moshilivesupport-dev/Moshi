import { BattleView } from "@/components/battle/BattleView";
import { Swords } from "lucide-react";

export default function BattlesPage() {
  // Demo data – replace with real query
  const demoBattles = [
    {
      id: "1",
      title: "Mode Duel – Robes vs Sneakers",
      status: "live",
      sideA: { username: "AminaStyle", score: 12450 },
      sideB: { username: "KofiSneakers", score: 10820 },
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
        <Swords className="w-6 h-6 text-champagne" /> Live Battles
      </h1>
      <p className="text-muted text-sm mb-8">
        Deux vendeurs s’affrontent. Envoyez des gifts pour soutenir votre camp !
      </p>

      <div className="space-y-6">
        {demoBattles.map((b) => (
          <BattleView key={b.id} title={b.title} sideA={b.sideA} sideB={b.sideB} status={b.status} />
        ))}
      </div>

      {demoBattles.length === 0 && (
        <div className="card text-center py-16 text-muted">
          Aucune battle en cours. Revenez bientôt !
        </div>
      )}
    </div>
  );
}

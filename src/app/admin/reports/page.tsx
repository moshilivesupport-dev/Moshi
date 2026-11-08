import Link from "next/link";
import { ArrowLeft, Flag } from "lucide-react";

export default function AdminReportsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-muted hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> Retour Admin
      </Link>
      <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
        <Flag className="w-6 h-6 text-coral" /> Signalements
      </h1>
      <p className="text-muted text-sm mb-8">Contenus et utilisateurs signalés par la communauté</p>

      <div className="card text-center py-16 text-muted text-sm">
        Aucun signalement pour le moment.
        <br />
        <span className="text-xs">Les reports arriveront ici (chat, lives, produits, profils).</span>
      </div>
    </div>
  );
}

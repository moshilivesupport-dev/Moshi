import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AdminSettingsPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-muted hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> Retour Admin
      </Link>
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Settings className="w-6 h-6 text-champagne" /> Réglages plateforme
      </h1>

      <div className="space-y-4">
        <div className="card">
          <p className="text-sm font-medium text-white mb-1">Maintenance</p>
          <p className="text-xs text-muted mb-3">Mettre la plateforme en mode maintenance</p>
          <Button size="sm" variant="outline">Activer la maintenance</Button>
        </div>
        <div className="card">
          <p className="text-sm font-medium text-white mb-1">Frais plateforme</p>
          <p className="text-xs text-muted mb-3">Commission sur les ventes et gifts (ex: 10%)</p>
          <input type="number" defaultValue={10} className="input-field w-24" /> %
        </div>
        <div className="card">
          <p className="text-sm font-medium text-white mb-1">Seuil de retrait minimum</p>
          <p className="text-xs text-muted mb-3">Montant minimum pour un payout vendeur</p>
          <input type="number" defaultValue={5000} className="input-field w-32" /> XOF
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Clock } from "lucide-react";

export default function PendingPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="card max-w-md text-center py-12">
        <div className="w-16 h-16 rounded-full bg-champagne/10 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-champagne" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Demande en cours de vérification</h1>
        <p className="text-muted text-sm mb-6">
          Notre équipe examine votre profil (photo, pays, âge, genre).
          Vous recevrez une notification dès validation.
        </p>
        <Link href="/">
          <Button variant="outline">Retour à l&apos;accueil</Button>
        </Link>
      </div>
    </div>
  );
}

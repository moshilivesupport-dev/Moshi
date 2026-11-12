import { createClient } from "@/lib/supabase/server";
import { Users, Video, Radio, Coins } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await createClient();

  // Récupération des statistiques en parallèle
  const [{ count: userCount }, { count: videoCount }, { count: liveCount }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("videos").select("*", { count: "exact", head: true }),
    supabase.from("live_sessions").select("*", { count: "exact", head: true }).eq("status", "live"),
  ]);

  // Calcul du total des coins en circulation
  const { data: coinsData } = await supabase.from("user_coins").select("balance");
  const totalCoins = coinsData?.reduce((acc, curr) => acc + (curr.balance || 0), 0) || 0;

  const stats = [
    { label: "Utilisateurs Totaux", value: userCount || 0, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Vidéos Publiées", value: videoCount || 0, icon: Video, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Lives en Cours", value: liveCount || 0, icon: Radio, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Coins en Circulation", value: totalCoins.toLocaleString("fr-FR"), icon: Coins, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
        <p className="text-sm text-neutral-400 mt-1">Vue d'ensemble de l'activité de la plateforme Moshi.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm text-neutral-400">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Bienvenue, Administrateur</h2>
        <p className="text-neutral-400 text-sm">
          Utilisez le menu de gauche pour gérer les utilisateurs, modérer le contenu ou ajuster les paramètres de la plateforme. 
          Les données affichées ci-dessus sont mises à jour en temps réel depuis votre base Supabase.
        </p>
      </div>
    </div>
  );
}

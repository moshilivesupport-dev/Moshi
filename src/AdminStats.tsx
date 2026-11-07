"use client";

import { Users, Radio, ShoppingBag, Coins, AlertTriangle, TrendingUp } from "lucide-react";

interface Stats {
  totalUsers: number;
  liveStreams: number;
  pendingSellers: number;
  totalOrders: number;
  revenue: string;
  reports: number;
}

export function AdminStats({ stats }: { stats: Stats }) {
  const cards = [
    { label: "Utilisateurs", value: stats.totalUsers.toLocaleString(), icon: Users, color: "text-coral" },
    { label: "Lives en cours", value: stats.liveStreams, icon: Radio, color: "text-champagne" },
    { label: "Vendeurs en attente", value: stats.pendingSellers, icon: AlertTriangle, color: "text-yellow-400" },
    { label: "Commandes", value: stats.totalOrders.toLocaleString(), icon: ShoppingBag, color: "text-green-400" },
    { label: "Revenus (estim.)", value: stats.revenue, icon: Coins, color: "text-gold" },
    { label: "Signalements", value: stats.reports, icon: TrendingUp, color: "text-red-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="card">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${c.color}`}>
              <c.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{c.value}</p>
              <p className="text-xs text-muted">{c.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState({
    liveFollowed: true,
    gifts: true,
    orders: true,
    marketing: false,
  });

  const toggle = (key: keyof typeof prefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-muted hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> Paramètres
      </Link>
      <h1 className="text-xl font-bold text-white mb-6">Notifications</h1>
      <div className="card divide-y divide-white/5 p-0">
        {[
          { key: "liveFollowed" as const, label: "Lives des vendeurs suivis" },
          { key: "gifts" as const, label: "Gifts reçus" },
          { key: "orders" as const, label: "Commandes & livraisons" },
          { key: "marketing" as const, label: "Offres & nouveautés" },
        ].map((item) => (
          <label key={item.key} className="flex items-center justify-between px-4 py-3.5 cursor-pointer">
            <span className="text-sm text-white">{item.label}</span>
            <input
              type="checkbox"
              checked={prefs[item.key]}
              onChange={() => toggle(item.key)}
              className="w-5 h-5 rounded accent-coral"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

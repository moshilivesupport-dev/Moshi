"use client";

import Link from "next/link";
import {
  User, Bell, Shield, FileText, HelpCircle, LogOut,
  ChevronRight, Globe, Wallet, Volume2, KeyRound
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const SECTIONS = [
  {
    title: "Compte",
    items: [
      { href: "/profile", label: "Mon profil", icon: User },
      { href: "/wallet", label: "Portefeuille Coins", icon: Wallet },
      { href: "/settings/password", label: "Mot de passe", icon: KeyRound },
      { href: "/settings/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    title: "Préférences",
    items: [
      { href: "/settings/language", label: "Langue", icon: Globe },
      { href: "/settings/sound", label: "Sons & Soundboard", icon: Volume2 },
    ],
  },
  {
    title: "Support & Légal",
    items: [
      { href: "/support", label: "Aide & Litiges", icon: HelpCircle },
      { href: "/legal/terms", label: "Conditions d'utilisation", icon: FileText },
      { href: "/legal/privacy", label: "Politique de confidentialité", icon: Shield },
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Paramètres</h1>

      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="text-xs font-medium text-muted uppercase tracking-wider mb-2 px-1">
              {section.title}
            </p>
            <div className="card p-0 overflow-hidden divide-y divide-white/5">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition"
                >
                  <item.icon className="w-5 h-5 text-coral flex-shrink-0" />
                  <span className="flex-1 text-sm text-white">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted" />
                </Link>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={logout}
          className="w-full card flex items-center gap-3 px-4 py-3.5 text-red-400 hover:bg-red-500/10 transition"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Se déconnecter</span>
        </button>
      </div>
    </div>
  );
}

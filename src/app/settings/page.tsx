"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Lock, 
  Bell, 
  Shield, 
  LogOut, 
  Moon, 
  Globe, 
  UserX,
  ChevronRight,
  Crown,
  Eye,
  Download,
  QrCode,
  HelpCircle,
  Info
} from "lucide-react";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [privateAccount, setPrivateAccount] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUser(user);

      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setProfile(data);
        setPrivateAccount(data.is_private || false);
      }
    };
    load();
  }, [supabase, router]);

  const togglePrivateAccount = async () => {
    const newValue = !privateAccount;
    setPrivateAccount(newValue);
    await supabase.from("profiles").update({ is_private: newValue }).eq("id", user?.id);
  };

  const togglePushNotifications = () => {
    setPushNotifications(!pushNotifications);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (!user) return <div className="h-[100dvh] bg-black flex items-center justify-center text-white">Chargement...</div>;

  const isAdmin = profile?.role === "admin";

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-neutral-800 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Paramètres</h1>
      </header>

      <div className="p-4 space-y-6">
        {/* ✅ Section Admin (visible uniquement pour les admins) */}
        {isAdmin && (
          <section>
            <h2 className="text-sm font-semibold text-neutral-400 mb-3 uppercase">Administrateur</h2>
            <button
              onClick={() => router.push("/admin")}
              className="w-full bg-gradient-to-r from-red-600 to-pink-600 rounded-xl p-4 flex items-center justify-between hover:from-red-700 hover:to-pink-700 transition"
            >
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-white" />
                <span className="font-semibold">Tableau de bord Admin</span>
              </div>
              <ChevronRight className="w-5 h-5" />
            </button>
          </section>
        )}

        {/* Confidentialité */}
        <section>
          <h2 className="text-sm font-semibold text-neutral-400 mb-3 uppercase">Confidentialité</h2>
          <div className="bg-neutral-900 rounded-xl overflow-hidden">
            <button 
              onClick={togglePrivateAccount}
              className="w-full flex items-center justify-between p-4 hover:bg-neutral-800 transition"
            >
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-neutral-400" />
                <span>Compte privé</span>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition ${privateAccount ? "bg-red-500" : "bg-neutral-600"}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${privateAccount ? "right-1" : "left-1"}`} />
              </div>
            </button>
            <div className="h-px bg-neutral-800" />
            <button 
              onClick={() => router.push("/blocked-accounts")}
              className="w-full flex items-center justify-between p-4 hover:bg-neutral-800 transition"
            >
              <div className="flex items-center gap-3">
                <UserX className="w-5 h-5 text-neutral-400" />
                <span>Comptes bloqués</span>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400" />
            </button>
          </div>
        </section>

        {/* Notifications */}
        <section>
          <h2 className="text-sm font-semibold text-neutral-400 mb-3 uppercase">Notifications</h2>
          <div className="bg-neutral-900 rounded-xl overflow-hidden">
            <button 
              onClick={togglePushNotifications}
              className="w-full flex items-center justify-between p-4 hover:bg-neutral-800 transition"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-neutral-400" />
                <span>Notifications push</span>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition ${pushNotifications ? "bg-red-500" : "bg-neutral-600"}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${pushNotifications ? "right-1" : "left-1"}`} />
              </div>
            </button>
          </div>
        </section>

        {/* Apparence */}
        <section>
          <h2 className="text-sm font-semibold text-neutral-400 mb-3 uppercase">Apparence</h2>
          <div className="bg-neutral-900 rounded-xl overflow-hidden">
            <button 
              onClick={toggleDarkMode}
              className="w-full flex items-center justify-between p-4 hover:bg-neutral-800 transition"
            >
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-neutral-400" />
                <span>Mode sombre</span>
              </div>
              <div className={`w-12 h-6 rounded-full relative transition ${darkMode ? "bg-red-500" : "bg-neutral-600"}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${darkMode ? "right-1" : "left-1"}`} />
              </div>
            </button>
            <div className="h-px bg-neutral-800" />
            <button 
              onClick={() => router.push("/language")}
              className="w-full flex items-center justify-between p-4 hover:bg-neutral-800 transition"
            >
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-neutral-400" />
                <span>Langue</span>
              </div>
              <span className="text-neutral-400 flex items-center gap-2">
                Français
                <ChevronRight className="w-5 h-5" />
              </span>
            </button>
          </div>
        </section>

        {/* Outils */}
        <section>
          <h2 className="text-sm font-semibold text-neutral-400 mb-3 uppercase">Outils</h2>
          <div className="bg-neutral-900 rounded-xl overflow-hidden">
            <button 
              onClick={() => router.push("/favorites")}
              className="w-full flex items-center justify-between p-4 hover:bg-neutral-800 transition"
            >
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-neutral-400" />
                <span>Mes favoris</span>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400" />
            </button>
            <div className="h-px bg-neutral-800" />
            <button 
              onClick={() => router.push("/history")}
              className="w-full flex items-center justify-between p-4 hover:bg-neutral-800 transition"
            >
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-neutral-400" />
                <span>Historique</span>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400" />
            </button>
            <div className="h-px bg-neutral-800" />
            <button 
              onClick={() => router.push("/stories")}
              className="w-full flex items-center justify-between p-4 hover:bg-neutral-800 transition"
            >
              <div className="flex items-center gap-3">
                <QrCode className="w-5 h-5 text-neutral-400" />
                <span>Mes stories</span>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400" />
            </button>
          </div>
        </section>

        {/* Sécurité */}
        <section>
          <h2 className="text-sm font-semibold text-neutral-400 mb-3 uppercase">Sécurité</h2>
          <div className="bg-neutral-900 rounded-xl overflow-hidden">
            <button 
              onClick={() => router.push("/change-password")}
              className="w-full flex items-center justify-between p-4 hover:bg-neutral-800 transition"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-neutral-400" />
                <span>Changer le mot de passe</span>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400" />
            </button>
          </div>
        </section>

        {/* Support */}
        <section>
          <h2 className="text-sm font-semibold text-neutral-400 mb-3 uppercase">Support</h2>
          <div className="bg-neutral-900 rounded-xl overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 hover:bg-neutral-800 transition">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-neutral-400" />
                <span>Centre d'aide</span>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400" />
            </button>
            <div className="h-px bg-neutral-800" />
            <button className="w-full flex items-center justify-between p-4 hover:bg-neutral-800 transition">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-neutral-400" />
                <span>À propos</span>
              </div>
              <ChevronRight className="w-5 h-5 text-neutral-400" />
            </button>
          </div>
        </section>

        {/* Déconnexion */}
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/10 text-red-500 rounded-xl font-semibold hover:bg-red-500/20 transition"
        >
          <LogOut className="w-5 h-5" /> Se déconnecter
        </button>

        <p className="text-center text-xs text-neutral-600">Moshi v1.3.0</p>
      </div>
    </div>
  );
}

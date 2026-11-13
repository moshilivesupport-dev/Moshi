"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft, PlaySquare, Sparkles, Radio, Bell, Hourglass,
  Home, User, Shield, Share2, Lock, Ban, MessageCircle, AtSign,
  Send, Copy, Link2, Download, Users, Heart, Music, Inbox, Clock,
  Megaphone, Languages, Moon, Accessibility, MapPin, CloudOff, Trash2,
  Gauge, Headphones, ShieldCheck, Info, ArrowLeftRight, LogOut,
} from "lucide-react";
import SettingsRow from "./_components/SettingsRow";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  // ✅ Fonction pour les pages qui n'existent pas encore
  const comingSoon = () => {
    alert("Cette fonctionnalité arrive bientôt ! 🚀");
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      <header className="sticky top-0 z-30 bg-black flex items-center gap-2 px-2 py-3">
        <button onClick={() => router.back()} className="p-2">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-semibold">Paramètres et confidentialité</h1>
      </header>

      <SectionTitle>Activité</SectionTitle>
      <Group>
        <SettingsRow icon={PlaySquare} label="Gérer les publications" onClick={comingSoon} />
        <SettingsRow icon={Sparkles} label="Préférences de contenu" onClick={comingSoon} />
        <SettingsRow icon={Radio} label="LIVE" onClick={comingSoon} />
        <SettingsRow icon={Bell} label="Notifications" onClick={comingSoon} />
        <SettingsRow icon={Hourglass} label="Temps d'écran et bien-être" onClick={comingSoon} />
        <SettingsRow icon={Home} label="Connexion Famille" onClick={comingSoon} />
      </Group>

      <SectionTitle>Compte</SectionTitle>
      <Group>
        <SettingsRow icon={User} label="Compte" href="/profile/edit" />
        <SettingsRow icon={Shield} label="Sécurité et autorisations" onClick={comingSoon} />
        <SettingsRow icon={Share2} label="Partager le profil" href="/profile/me" />
      </Group>

      <SectionTitle>Visibilité</SectionTitle>
      <Group>
        <SettingsRow icon={Lock} label="Compte privé" onClick={comingSoon} />
        <SettingsRow icon={Ban} label="Comptes bloqués" onClick={comingSoon} />
      </Group>

      <SectionTitle>Interactions</SectionTitle>
      <Group>
        <SettingsRow icon={MessageCircle} label="Commentaires" onClick={comingSoon} />
        <SettingsRow icon={AtSign} label="Mentions" onClick={comingSoon} />
        <SettingsRow icon={Send} label="Messages directs" onClick={comingSoon} />
        <SettingsRow icon={Copy} label="Réutilisation du contenu" onClick={comingSoon} />
        <SettingsRow icon={Link2} label="Afficher le profil lors..." rightText="Activé" onClick={comingSoon} />
        <SettingsRow icon={Download} label="Téléchargements" rightText="Activé" onClick={comingSoon} />
        <SettingsRow icon={Users} label="Liste de suivis" rightText="Toi uniquement" onClick={comingSoon} />
        <SettingsRow icon={Heart} label="Vidéos aimées" rightText="Toi uniquement" onClick={comingSoon} />
      </Group>

      <SectionTitle>Préférences</SectionTitle>
      <Group>
        <SettingsRow icon={Music} label="Musique" onClick={comingSoon} />
        <SettingsRow icon={Inbox} label="Boîte de réception et messagerie" onClick={comingSoon} />
        <SettingsRow icon={Clock} label="Centre des activités" onClick={comingSoon} />
        <SettingsRow icon={Users} label="Contrôle du public" onClick={comingSoon} />
        <SettingsRow icon={Megaphone} label="Publicités" onClick={comingSoon} />
        <SettingsRow icon={PlaySquare} label="Lecture" onClick={comingSoon} />
        <SettingsRow icon={Languages} label="Langues" onClick={comingSoon} />
        <SettingsRow icon={Moon} label="Affichage" onClick={comingSoon} />
        <SettingsRow icon={Accessibility} label="Accessibilité" onClick={comingSoon} />
        <SettingsRow icon={MapPin} label="Contacts et localisation" onClick={comingSoon} />
      </Group>

      <SectionTitle>Cache et données mobiles</SectionTitle>
      <Group>
        <SettingsRow icon={CloudOff} label="Vidéos hors ligne" onClick={comingSoon} />
        <SettingsRow icon={Trash2} label="Libérer de l'espace" onClick={comingSoon} />
        <SettingsRow icon={Gauge} label="Économiseur de données" onClick={comingSoon} />
      </Group>

      <SectionTitle>Assistance et informations</SectionTitle>
      <Group>
        <SettingsRow icon={Headphones} label="Centre d'aide" onClick={comingSoon} />
        <SettingsRow icon={ShieldCheck} label="Centre de confidentialité" onClick={comingSoon} />
        <SettingsRow icon={Info} label="Conditions et politiques" onClick={comingSoon} />
      </Group>

      <SectionTitle>Connexion</SectionTitle>
      <Group>
        <SettingsRow icon={ArrowLeftRight} label="Changer de compte" href="/auth/login" />
        <SettingsRow icon={LogOut} label="Se déconnecter" onClick={handleLogout} isDanger />
      </Group>

      <p className="text-center text-[10px] text-neutral-600 py-8">
        Version 1.3.0 (Final Release) · Moshi
      </p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider px-4 pt-6 pb-2">
      {children}
    </h2>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-neutral-950 border-y border-neutral-800/50">
      {children}
    </div>
  );
}
"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ChevronLeft, PlaySquare, Sparkles, Radio, Bell, Hourglass,
  Home, User, Shield, Share2, Lock, Ban, MessageCircle, AtSign,
  Send, Copy, Link2, Download, Users, Heart, Music, Inbox, Clock, Globe,
  Megaphone, Languages, Moon, Accessibility, MapPin, CloudOff, Trash2,
  Gauge, Headphones, ShieldCheck, Info, ArrowLeftRight, LogOut,
} from "lucide-react";
import SettingsRow from "./_components/SettingsRow";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    load();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-black flex items-center gap-2 px-2 py-3">
        <button onClick={() => router.back()} className="p-2">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-semibold">Paramètres et confidentialité</h1>
      </header>

      {/* ACTIVITÉ */}
      <SectionTitle>Activité</SectionTitle>
      <Group>
        <SettingsRow icon={PlaySquare} label="Gérer les publications" href="/settings/manage-posts" />
        <SettingsRow icon={Sparkles} label="Préférences de contenu" href="/settings/content-preferences" />
        <SettingsRow icon={Radio} label="LIVE" href="/settings/live" />
        <SettingsRow icon={Bell} label="Notifications" href="/settings/notifications" />
        <SettingsRow icon={Hourglass} label="Temps d'écran et bien-être" href="/settings/screen-time" />
        <SettingsRow icon={Home} label="Connexion Famille" href="/settings/family" />
      </Group>

      {/* COMPTE */}
      <SectionTitle>Compte</SectionTitle>
      <Group>
        <SettingsRow icon={User} label="Compte" href="/settings/account" />
        <SettingsRow icon={Shield} label="Sécurité et autorisations" href="/settings/security" />
        <SettingsRow icon={Share2} label="Partager le profil" href="/profile/me" />
      </Group>

      {/* VISIBILITÉ */}
      <SectionTitle>Visibilité</SectionTitle>
      <Group>
        <SettingsRow icon={Lock} label="Compte privé" href="/settings/private" />
        <SettingsRow icon={Ban} label="Comptes bloqués" href="/settings/blocked" />
      </Group>

      {/* INTERACTIONS */}
      <SectionTitle>Interactions</SectionTitle>
      <Group>
        <SettingsRow icon={MessageCircle} label="Commentaires" href="/settings/comments" />
        <SettingsRow icon={AtSign} label="Mentions" href="/settings/mentions" />
        <SettingsRow icon={Send} label="Messages directs" href="/settings/messages" />
        <SettingsRow icon={Copy} label="Réutilisation du contenu" href="/settings/reuse" />
        <SettingsRow icon={Link2} label="Afficher le profil lors..." rightText="Activé" href="/settings/profile-visibility" />
        <SettingsRow icon={Download} label="Téléchargements" rightText="Activé" href="/settings/downloads" />
        <SettingsRow icon={Users} label="Liste de suivis" rightText="Toi uniquement" href="/settings/followers" />
        <SettingsRow icon={Heart} label="Vidéos aimées" rightText="Toi uniquement" href="/settings/liked" />
      </Group>

      {/* PRÉFÉRENCES (Capture #3) */}
      <SectionTitle>Préférences</SectionTitle>
      <Group>
        <SettingsRow icon={Music} label="Musique" href="/settings/music" />
        <SettingsRow icon={Inbox} label="Boîte de réception et messagerie" href="/settings/inbox" />
        <SettingsRow icon={Clock} label="Centre des activités" href="/settings/activity" />
        <SettingsRow icon={Users} label="Contrôle du public" href="/settings/audience" />
        <SettingsRow icon={Megaphone} label="Publicités" href="/settings/ads" />
        <SettingsRow icon={PlaySquare} label="Lecture" href="/settings/playback" />
        <SettingsRow icon={Languages} label="Langues" href="/settings/languages" />
        <SettingsRow icon={Moon} label="Affichage" href="/settings/display" />
        <SettingsRow icon={Accessibility} label="Accessibilité" href="/settings/accessibility" />
        <SettingsRow icon={MapPin} label="Contacts et localisation" href="/settings/contacts" />
      </Group>

      {/* CACHE ET DONNÉES MOBILES (Capture #4) */}
      <SectionTitle>Cache et données mobiles</SectionTitle>
      <Group>
        <SettingsRow icon={CloudOff} label="Vidéos hors ligne" href="/settings/offline" />
        <SettingsRow icon={Trash2} label="Libérer de l'espace" href="/settings/storage" />
        <SettingsRow icon={Gauge} label="Économiseur de données" href="/settings/data-saver" />
      </Group>

      {/* ASSISTANCE ET INFORMATIONS (Capture #4) */}
      <SectionTitle>Assistance et informations</SectionTitle>
      <Group>
        <SettingsRow icon={Headphones} label="Centre d'aide" href="/settings/help" />
        <SettingsRow icon={ShieldCheck} label="Centre de confidentialité" href="/settings/privacy-center" />
        <SettingsRow icon={Info} label="Conditions et politiques" href="/settings/terms" />
      </Group>

      {/* CONNEXION (Capture #4) */}
      <SectionTitle>Connexion</SectionTitle>
      <Group>
        <SettingsRow icon={ArrowLeftRight} label="Changer de compte" href="/auth/login" />
        <SettingsRow
          icon={LogOut}
          label="Se déconnecter"
          onClick={handleLogout}
          isDanger
        />
      </Group>

      {/* Footer */}
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
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, Plus, FolderOpen, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CreateToolsRow from "@/components/create/CreateToolsRow";
import TemplateCard from "@/components/create/TemplateCard";
import { cn } from "@/lib/utils";

type TabKey = "foryou" | "viral" | "trending" | "ai";

const TABS: { key: TabKey; label: string }[] = [
  { key: "foryou", label: "Pour toi" },
  { key: "viral", label: "Chanson virale" },
  { key: "trending", label: "Tendance" },
  { key: "ai", label: "IA" },
];

interface Template {
  id: string;
  thumbnail_url: string;
  title: string;
  usage_count: number;
  clip_count: number | null;
  category: string;
}

export default function CreatePage() {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<TabKey>("foryou");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true);
      // Requête sur ta table de modèles (à créer en SQL plus bas)
      const { data } = await supabase
        .from("video_templates")
        .select("id, thumbnail_url, title, usage_count, clip_count, category")
        .eq("category", activeTab === "foryou" ? "viral" : activeTab)
        .order("usage_count", { ascending: false })
        .limit(20);
      
      setTemplates(data || []);
      setLoading(false);
    };
    loadTemplates();
  }, [activeTab, supabase]);

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-black flex items-center justify-between px-4 py-3">
        <button onClick={() => router.back()} className="p-2">
          <X className="w-6 h-6" />
        </button>
        <h1 className="text-base font-semibold tracking-wide">CRÉER</h1>
        <div className="w-10" /> {/* Spacer pour centrer le titre */}
      </header>

      {/* Rangée d'outils */}
      <CreateToolsRow />

      {/* Deux grosses cartes */}
      <div className="px-4 grid grid-cols-[2fr_1fr] gap-3 mt-4 mb-6">
        {/* Nouvelle vidéo */}
        <Link
          href="/videos/new"
          className="relative bg-gradient-to-br from-pink-100 to-cyan-100 rounded-2xl aspect-[2/1] flex flex-col items-center justify-center"
        >
          <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center mb-2">
            <Plus className="w-6 h-6 text-white" strokeWidth={3} />
          </div>
          <p className="text-black font-bold text-base">Nouvelle vidéo</p>
        </Link>

        {/* Brouillons */}
        <button className="bg-neutral-900 rounded-2xl aspect-[2/1] flex flex-col items-center justify-center border border-neutral-800">
          <FolderOpen className="w-8 h-8 text-white mb-2" />
          <p className="text-white font-semibold text-sm">Brouillons</p>
        </button>
      </div>

      {/* Section Modèles */}
      <div className="px-4 mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Modèles</h2>
        <button className="w-9 h-9 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
          <Search className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Onglets des modèles */}
      <div className="flex gap-4 px-4 overflow-x-auto scrollbar-hide pb-3">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "text-sm font-semibold whitespace-nowrap transition-colors relative pb-2",
              activeTab === tab.key ? "text-white" : "text-neutral-500"
            )}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Grille de modèles */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <p className="text-neutral-500 text-sm">
            Aucun modèle disponible dans cette catégorie.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              id={template.id}
              thumbnailUrl={template.thumbnail_url}
              title={template.title}
              usageCount={template.usage_count}
              clipCount={template.clip_count || undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

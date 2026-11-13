"use client";

import { useRouter } from "next/navigation";
import {
  ImageEdit, Wand2, Type, Sparkles, Scissors
} from "lucide-react";

const tools = [
  { id: "photo-editor", icon: ImageEdit, label: "Éditeur de photos", href: "/create/photo-editor" },
  { id: "autocut", icon: Wand2, label: "AutoCut", href: "/create/autocut" },
  { id: "captions", icon: Type, label: "Légendes", href: "/create/captions" },
  { id: "ai-self", icon: Sparkles, label: "AI Self", href: "/create/ai-self" },
  { id: "cutout", icon: Scissors, label: "Détourage", href: "/create/cutout" },
];

export default function CreateToolsRow() {
  const router = useRouter();

  return (
    <div className="flex items-start justify-between px-4 py-3 gap-2 overflow-x-auto scrollbar-hide">
      {tools.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            onClick={() => router.push(tool.href)}
            className="flex flex-col items-center gap-1.5 min-w-[64px] flex-shrink-0"
          >
            <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] text-white text-center leading-tight">
              {tool.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
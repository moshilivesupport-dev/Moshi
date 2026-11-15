"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, Gift, Eye } from "lucide-react";
import HomeFeed from "@/components/home/HomeFeed";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("Pour toi");

  return (
    <div className="relative h-[100dvh] w-full bg-black overflow-hidden">
      
      {/* HEADER FLOTTANT */}
      <div className="absolute top-0 left-0 right-0 z-40 px-4 pt-12 pb-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        
        {/* Ligne du haut (Logo + Search + Gift) */}
        <div className="flex items-center justify-between mb-5 pointer-events-auto">
          <div className="flex items-center gap-2">
            {/* Le logo (assure toi d'avoir moshi-logo.jpg ou logo.png dans public) */}
            <Image
              src="/moshi-logo.jpg"
              alt="Moshi"
              width={100}
              height={40}
              className="h-9 w-auto object-contain"
              priority
            />
          </div>
          
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
              <Search size={20} />
            </button>
            <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/10 relative">
              <Gift size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF4B72]"></span>
            </button>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex items-center justify-center gap-8 pointer-events-auto">
          {["Communauté", "Suivis", "Pour toi"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "text-[16px] font-semibold transition-colors relative pb-1.5 drop-shadow-md",
                activeTab === tab ? "text-white" : "text-white/70"
              )}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full moshi-gradient" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* BOUTON LIVE (à gauche, sous les onglets) */}
      <div className="absolute top-36 left-4 z-40">
        <button className="flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/20 rounded-full px-3 py-1.5 text-white text-xs font-semibold shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#FF4B72] animate-pulse"></span>
          Live 2.5k <Eye size={12} className="text-white/70" />
        </button>
      </div>

      {/* LE FEED */}
      <div className="h-full">
        <HomeFeed />
      </div>
    </div>
  );
}
"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, Gift, Radio, Bell } from "lucide-react";
import Link from "next/link";
import HomeFeed from "@/components/home/HomeFeed";
import StoriesBar from "@/components/home/StoriesBar";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("Pour toi");

  return (
    <div className="relative h-[100dvh] w-full bg-black overflow-hidden">
      
      {/* HEADER FLOTTANT */}
      <div className="absolute top-0 left-0 right-0 z-40 px-4 pt-12 pb-2 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        
        {/* Ligne 1 : Logo + Actions */}
        <div className="flex items-center justify-between mb-3 pointer-events-auto">
          <div className="flex items-center">
            <Image src="/brand/moshi-logo.jpg" alt="Moshi" width={120} height={40} className="h-9 w-auto object-contain" priority />
          </div>
          
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
              <Search size={18} />
            </button>
            <button className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/10 relative">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"></span>
            </button>
          </div>
        </div>

        {/* Ligne 2 : BARRE DE STORIES */}
        <StoriesBar />

        {/* Ligne 3 : ONGLETS DU FEED */}
        <div className="flex items-center justify-between mt-4 pointer-events-auto">
          <div className="flex items-center gap-5">
            {["Pour toi", "Suivis", "Boutique", "Découvrir"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "text-[15px] font-semibold transition-colors relative pb-1 drop-shadow-md",
                  activeTab === tab ? "text-white" : "text-white/70"
                )}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full moshi-gradient" />
                )}
              </button>
            ))}
          </div>
          <button className="text-white/80">
            <span className="text-xl">...</span>
          </button>
        </div>
      </div>

      {/* LE FEED */}
      <div className="h-full">
        <HomeFeed />
      </div>
    </div>
  );
}
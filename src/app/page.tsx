"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, Gift, Radio } from "lucide-react";
import Link from "next/link";
import HomeFeed from "@/components/home/HomeFeed";
import StoriesBar from "@/components/home/StoriesBar";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("Pour toi");

  return (
    <div className="relative h-[100dvh] w-full bg-black overflow-hidden">
      
      <div className="absolute top-0 left-0 right-0 z-40 px-4 pt-12 pb-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <div className="flex items-center justify-between mb-5 pointer-events-auto">
          <div className="flex items-center">
            <Image src="/brand/moshi-logo.jpg" alt="Moshi" width={120} height={40} className="h-10 w-auto object-contain" priority />
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/live" className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white border border-white/10 relative shadow-lg">
              <Radio size={18} />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse" />
            </Link>
            <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
              <Search size={20} />
            </button>
            <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/10 relative">
              <Gift size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-8 pointer-events-auto">
          {["Communauté", "Suivis", "Pour toi"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn("text-[16px] font-semibold transition-colors relative pb-1.5 drop-shadow-md", activeTab === tab ? "text-white" : "text-white/70")}
            >
              {tab}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full moshi-gradient" />}
            </button>
          ))}
        </div>
      </div>

      {/* BARRE DE STORIES (au-dessus du feed) */}
      <StoriesBar />

      {/* LE FEED (vidéos + lives) */}
      <div className="h-full">
        <HomeFeed />
      </div>
    </div>
  );
}
"use client";

import { useState } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import HomeFeed from "@/components/home/HomeFeed";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("Pour toi");

  return (
    <div className="relative h-[100dvh] w-full bg-black overflow-hidden">
      {/* HEADER FLOTTANT */}
      <div className="absolute top-0 left-0 right-0 z-40 px-4 pt-6 pb-2 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between mb-4">
          <Image
            src="/moshi-logo.jpg"
            alt="Moshi"
            width={80}
            height={32}
            className="h-8 w-auto object-contain rounded-lg"
            priority
          />
          <button className="moshi-glass w-10 h-10 rounded-full flex items-center justify-center text-white">
            <Search size={20} />
          </button>
        </div>

        {/* ONGLETS */}
        <div className="flex items-center justify-center gap-6">
          {["Communauté", "Suivis", "Pour toi"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "text-sm font-semibold transition-colors relative pb-2",
                activeTab === tab ? "text-white" : "text-white/60"
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

      {/* LE FEED */}
      <div className="h-full">
        <HomeFeed />
      </div>
    </div>
  );
}
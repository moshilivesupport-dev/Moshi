"use client";

import { useState } from "react";
import HomeFeed from "@/components/home/HomeFeed";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("Pour toi");

  return (
    <div className="relative h-[100dvh] w-full bg-black overflow-hidden">
      {/* HEADER FLOTTANT */}
      <div className="absolute top-0 left-0 right-0 z-40 px-4 pt-6 pb-2 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between mb-4">
          <img src="/moshi-logo.jpg" alt="Moshi" className="h-8 w-auto object-contain" />
          <button className="moshi-glass w-10 h-10 rounded-full flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
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
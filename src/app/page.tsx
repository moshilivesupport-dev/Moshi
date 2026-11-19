
"use client";

import { useState } from "react";
import Image from "next/image";
import { Search, Gift } from "lucide-react";
import HomeFeed from "@/components/home/HomeFeed";
import MoshiLiveFeed from "@/components/home/MoshiLiveFeed";
import { cn } from "@/lib/utils";

type HomeTab = "Pour toi" | "Suivis" | "Moshi Live";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<HomeTab>("Pour toi");

  const tabs: HomeTab[] = ["Pour toi", "Suivis", "Moshi Live"];

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-40 bg-gradient-to-b from-black/90 via-black/60 to-transparent px-4 pb-2 pt-12">
        <div className="pointer-events-auto mb-3 flex items-center justify-between">
          <Image
            src="/brand/moshi-logo.jpg"
            alt="Moshi"
            width={120}
            height={40}
            className="h-9 w-auto object-contain drop-shadow-md"
            priority
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Rechercher"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur-md"
            >
              <Search size={18} />
            </button>

            <button
              type="button"
              aria-label="Cadeaux"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur-md"
            >
              <Gift size={18} />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>
          </div>
        </div>

        <div className="pointer-events-auto mt-4 flex items-center justify-between">
          <div className="flex items-center gap-5">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative whitespace-nowrap pb-1 text-[15px] font-semibold transition-colors",
                  activeTab === tab
                    ? "text-white"
                    : "text-white/70"
                )}
              >
                {tab}

                {activeTab === tab && (
                  <div className="moshi-gradient absolute bottom-0 left-0 right-0 h-[2px] rounded-full" />
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="text-xl text-white/80"
            aria-label="Plus d'options"
          >
            ...
          </button>
        </div>
      </div>

      <div className="h-full">
        {activeTab === "Moshi Live" ? (
          <MoshiLiveFeed />
        ) : activeTab === "Suivis" ? (
          <HomeFeed key="following" mode="following" />
        ) : (
          <HomeFeed key="forYou" mode="forYou" />
        )}
      </div>
    </div>
  );
}

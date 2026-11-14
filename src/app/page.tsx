"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import HomeFeed from "@/components/home/HomeFeed";
import FollowingFeed from "@/components/feed/FollowingFeed";
import LiveBar from "@/components/live/LiveBar";
import { cn } from "@/lib/utils";

type Tab = "community" | "following" | "foryou";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("foryou");

  return (
    <div className="relative h-[100dvh] w-full bg-black">
      {/* HEADER */}
      <div className="absolute top-0 left-0 right-0 z-40 pt-safe bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <button className="flex items-center gap-1 text-white">
            <div className="bg-red-500 border-2 border-red-500 rounded px-1.5 py-0.5 text-[10px] font-bold text-white">LIVE</div>
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("community")}
              className={cn("text-sm font-semibold transition-colors", activeTab === "community" ? "text-white" : "text-white/60")}
            >
              Communauté
            </button>
            <button
              onClick={() => setActiveTab("following")}
              className={cn("text-sm font-semibold transition-colors", activeTab === "following" ? "text-white" : "text-white/60")}
            >
              Suivis
            </button>
            <button
              onClick={() => setActiveTab("foryou")}
              className={cn("text-sm font-semibold transition-colors relative", activeTab === "foryou" ? "text-white" : "text-white/60")}
            >
              Pour toi
              {activeTab === "foryou" && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-white rounded-full" />
              )}
            </button>
          </div>

          <Link href="/search" className="text-white">
            <Search className="w-6 h-6" />
          </Link>
        </div>

        {/* ✅ LA BARRE DES LIVES (juste en dessous du header) */}
        <LiveBar />
      </div>

      {/* FEED */}
      <div className="h-full pt-20">
        {activeTab === "foryou" && <HomeFeed />}
        {activeTab === "following" && <FollowingFeed />}
        {activeTab === "community" && <HomeFeed />}
      </div>
    </div>
  );
}
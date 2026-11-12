"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import HomeFeed from "@/components/home/HomeFeed";
import FollowingFeed from "@/components/feed/FollowingFeed";
import Link from "next/link";
import { Search } from "lucide-react";

type Tab = "foryou" | "following";

export default function HomeTabs() {
  const [tab, setTab] = useState<Tab>("foryou");

  return (
    <div className="relative h-[100dvh] bg-black overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-center pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 bg-gradient-to-b from-black/80 to-transparent">
        <Link
          href="/search"
          className="absolute left-3 p-2 text-white/80"
          aria-label="Recherche"
        >
          <Search className="w-5 h-5" />
        </Link>

        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setTab("following")}
            className={cn(
              "text-[15px] font-semibold transition",
              tab === "following" ? "text-white" : "text-white/50"
            )}
          >
            Suivis
            {tab === "following" && (
              <div className="mx-auto mt-1 h-0.5 w-8 rounded-full bg-white" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab("foryou")}
            className={cn(
              "text-[15px] font-semibold transition",
              tab === "foryou" ? "text-white" : "text-white/50"
            )}
          >
            Pour toi
            {tab === "foryou" && (
              <div className="mx-auto mt-1 h-0.5 w-8 rounded-full bg-white" />
            )}
          </button>
        </div>
      </div>

      {tab === "foryou" ? <HomeFeed /> : <FollowingFeed />}
    </div>
  );
}
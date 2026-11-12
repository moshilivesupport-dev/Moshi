"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import HomeFeed from "@/components/home/HomeFeed";
import FollowingFeed from "@/components/feed/FollowingFeed";

type Tab = "community" | "following" | "foryou";

export default function HomeTabs() {
  const [tab, setTab] = useState<Tab>("foryou");

  return (
    <div className="relative h-[100dvh] bg-black overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-30 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between px-3 h-11">
          <Link
            href="/live"
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/30"
          >
            <span className="text-[10px] font-extrabold tracking-wide text-white bg-red-500 px-1.5 py-0.5 rounded">
              LIVE
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setTab("community")}
              className={cn(
                "text-[15px] font-semibold",
                tab === "community" ? "text-white" : "text-white/55"
              )}
            >
              Communaute
            </button>
            <button
              type="button"
              onClick={() => setTab("following")}
              className={cn(
                "text-[15px] font-semibold",
                tab === "following" ? "text-white" : "text-white/55"
              )}
            >
              Suivis
            </button>
            <button
              type="button"
              onClick={() => setTab("foryou")}
              className={cn(
                "relative text-[15px] font-semibold",
                tab === "foryou" ? "text-white" : "text-white/55"
              )}
            >
              Pour toi
              {tab === "foryou" && (
                <span className="absolute left-1/2 -translate-x-1/2 -bottom-1 h-[2px] w-8 bg-white rounded-full" />
              )}
            </button>
          </div>

          <Link href="/search" className="p-2 text-white" aria-label="Recherche">
            <Search className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {tab === "following" ? (
        <FollowingFeed />
      ) : (
        <HomeFeed />
      )}
    </div>
  );
}
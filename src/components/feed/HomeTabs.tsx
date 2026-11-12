"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import HomeFeed from "@/components/home/HomeFeed";
import FollowingFeed from "./FollowingFeed";

export default function HomeTabs() {
  const [activeTab, setActiveTab] = useState<"foryou" | "following">("foryou");

  return (
    <div className="relative h-[100dvh] bg-black overflow-hidden">
      {/* Header avec onglets */}
      <header className="absolute top-0 left-0 right-0 z-40 pt-4 pb-2">
        <div className="flex items-center justify-center gap-8">
          <button
            onClick={() => setActiveTab("following")}
            className={`relative text-base font-semibold transition-colors ${
              activeTab === "following" ? "text-white" : "text-neutral-400"
            }`}
          >
            Suivis
            {activeTab === "following" && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white rounded-full"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab("foryou")}
            className={`relative text-base font-semibold transition-colors ${
              activeTab === "foryou" ? "text-white" : "text-neutral-400"
            }`}
          >
            Pour toi
            {activeTab === "foryou" && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white rounded-full"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        </div>
      </header>

      {/* Contenu des onglets avec transition */}
      <div className="relative h-full">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: activeTab === "foryou" ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: activeTab === "foryou" ? -20 : 20 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {activeTab === "foryou" ? <HomeFeed /> : <FollowingFeed />}
        </motion.div>
      </div>
    </div>
  );
}

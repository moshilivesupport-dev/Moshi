"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import HomeFeed from "@/components/home/HomeFeed";

export default function HomeTabs() {
  const [activeTab, setActiveTab] = useState<"foryou" | "following">("foryou");

  return (
    <div className="relative h-[100dvh] bg-black overflow-hidden">
      {/* Header avec onglets */}
      <header className="absolute top-0 left-0 right-0 z-40 pt-12 pb-2 bg-gradient-to-b from-black/60 to-transparent">
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

      {/* Contenu des onglets */}
      <div className="relative h-full">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {activeTab === "foryou" ? <HomeFeed /> : <HomeFeed />}
        </motion.div>
      </div>
    </div>
  );
}

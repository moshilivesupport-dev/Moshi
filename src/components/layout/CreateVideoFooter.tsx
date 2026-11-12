"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type DurationKey = "10min" | "60s" | "15s" | "photo" | "text";
export type TabKey = "live" | "camera" | "create";

interface CreateVideoFooterProps {
  role?: "acheteur" | "vendeur" | "admin" | string;
  selectedDuration?: DurationKey;
  onDurationChange?: (d: DurationKey) => void;
  isRecording?: boolean;
  onRecordToggle?: () => void;
  activeTab?: TabKey;
  onTabChange?: (t: TabKey) => void;
  onLiveClick?: () => void;
  isUploading?: boolean;
  className?: string;
}

const DURATIONS: { key: DurationKey; label: string }[] = [
  { key: "10min", label: "10 min" },
  { key: "60s", label: "60 s" },
  { key: "15s", label: "15 s" },
  { key: "photo", label: "PHOTO" },
  { key: "text", label: "TEXTE" },
];

const TABS: { key: TabKey; label: string }[] = [
  { key: "live", label: "LIVE" },
  { key: "camera", label: "CAMÉRA" },
  { key: "create", label: "CRÉER" },
];

const LEFT_AVATARS = [
  "https://i.pravatar.cc/150?img=11",
  "https://i.pravatar.cc/150?img=12",
];
const RIGHT_AVATARS = [
  "https://i.pravatar.cc/150?img=47",
  "https://i.pravatar.cc/150?img=48",
];

export default function CreateVideoFooter({
  role = "acheteur",
  selectedDuration,
  onDurationChange,
  isRecording,
  onRecordToggle,
  activeTab,
  onTabChange,
  onLiveClick,
  isUploading = false,
  className = "",
}: CreateVideoFooterProps) {
  const [internalDuration, setInternalDuration] = useState<DurationKey>("15s");
  const [internalRecording, setInternalRecording] = useState(false);
  const [internalTab, setInternalTab] = useState<TabKey>("camera");

  const currentDuration = selectedDuration ?? internalDuration;
  const recording = isRecording ?? internalRecording;
  const currentTab = activeTab ?? internalTab;

  const isSeller = role === "vendeur" || role === "admin";

  const handleDuration = (d: DurationKey) => {
    if (onDurationChange) onDurationChange(d);
    else setInternalDuration(d);
  };

  const handleRecord = () => {
    if (currentTab === "live" && isSeller && onLiveClick) {
      onLiveClick();
      return;
    }
    if (onRecordToggle) onRecordToggle();
    else setInternalRecording((v) => !v);
  };

  const handleTab = (t: TabKey) => {
    if (onTabChange) onTabChange(t);
    else setInternalTab(t);
  };

  return (
    <div className={cn("w-full bg-black select-none", className)}>
      {/* A. SÉLECTEUR DE DURÉE */}
      <div className="flex items-center justify-center gap-5 py-3 mb-4">
        {DURATIONS.map((d) => {
          const isActive = currentDuration === d.key;
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => handleDuration(d.key)}
              className={cn(
                "font-semibold text-sm transition-all",
                isActive
                  ? "bg-white text-black px-4 py-1.5 rounded-full"
                  : "text-white/80 hover:text-white"
              )}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      {/* B. BARRE PRINCIPALE */}
      <div className="relative w-full h-20 flex items-center justify-between px-4">
        <div className="flex gap-2">
          {LEFT_AVATARS.map((src) => (
            <button key={src} type="button" className="w-11 h-11 rounded-full overflow-hidden border border-white/20 relative">
              <Image src={src} alt="" fill unoptimized className="object-cover" />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleRecord}
          disabled={isUploading}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-[88px] h-[88px] rounded-full border-[4px] border-white bg-black flex items-center justify-center focus:outline-none disabled:opacity-60"
        >
          <motion.div
            className={cn(
              "w-[72px] h-[72px]",
              currentTab === "live" && isSeller ? "bg-purple-600" : "bg-[#FE2C55]"
            )}
            initial={false}
            animate={{
              scale: recording ? 0.7 : 1,
              borderRadius: recording ? "12px" : "9999px",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </button>

        <div className="flex gap-2">
          {RIGHT_AVATARS.map((src) => (
            <button key={src} type="button" className="w-11 h-11 rounded-full overflow-hidden border border-white/20 relative">
              <Image src={src} alt="" fill unoptimized className="object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* C. ONGLETS DU BAS */}
      <div className="flex items-center justify-center gap-10 pt-6 pb-8">
        {TABS.map((t) => {
          const isActive = currentTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => handleTab(t.key)}
              className={cn(
                "text-sm tracking-wide pb-1 transition-all",
                isActive
                  ? "text-white font-bold border-b-2 border-white"
                  : "text-white/50 font-semibold hover:text-white/80"
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Video, Radio, Image as ImageIcon, X } from "lucide-react";

interface CreateMenuProps {
  open: boolean;
  onClose: () => void;
}

const items = [
  {
    href: "/videos/new",
    label: "Vidéo",
    desc: "Publier une vidéo courte",
    icon: Video,
    color: "bg-pink-500",
  },
  {
    href: "/seller/live",
    label: "Live",
    desc: "Passer en direct",
    icon: Radio,
    color: "bg-red-500",
  },
  {
    href: "/stories/new",
    label: "Story",
    desc: "Story 24 h",
    icon: ImageIcon,
    color: "bg-blue-500",
  },
];

export default function CreateMenu({ open, onClose }: CreateMenuProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-label="Fermer"
      />
      <div className="relative w-full max-w-lg bg-neutral-950 border-t border-neutral-800 rounded-t-3xl px-4 pt-3 pb-8 animate-in slide-in-from-bottom">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-700" />
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-base font-semibold text-white">Créer</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-neutral-800"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex flex-col items-center gap-2 rounded-2xl bg-neutral-900 border border-neutral-800 px-2 py-4 active:scale-95 transition"
              >
                <div
                  className={`w-12 h-12 rounded-full ${item.color} flex items-center justify-center`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-semibold text-white">
                  {item.label}
                </span>
                <span className="text-[10px] text-neutral-500 text-center leading-tight">
                  {item.desc}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
"use client";

import Link from "next/link";
import { ChevronRight, LucideIcon } from "lucide-react";

interface SettingsRowProps {
  icon: LucideIcon;
  label: string;
  href?: string;
  onClick?: () => void;
  rightText?: string;
  isDanger?: boolean;
  avatarUrl?: string;
}

export default function SettingsRow({
  icon: Icon,
  label,
  href,
  onClick,
  rightText,
  isDanger = false,
  avatarUrl,
}: SettingsRowProps) {
  const content = (
    <div className={`flex items-center justify-between px-4 py-4 ${isDanger ? "text-red-500" : "text-white"}`}>
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
        ) : (
          <Icon className={`w-5 h-5 ${isDanger ? "text-red-500" : "text-neutral-300"}`} />
        )}
        <span className="text-[15px] font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {rightText && <span className="text-sm text-neutral-400">{rightText}</span>}
        <ChevronRight className="w-5 h-5 text-neutral-500" />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block border-b border-neutral-800/50 last:border-b-0 active:bg-neutral-900">
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className="w-full text-left border-b border-neutral-800/50 last:border-b-0 active:bg-neutral-900">
      {content}
    </button>
  );
}
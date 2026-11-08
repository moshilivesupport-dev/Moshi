"use client";

import { cn } from "@/lib/utils";

interface Story {
  id: string;
  seller_username: string;
  avatar_url?: string;
  has_unseen?: boolean;
}

export function StoryBar({ stories }: { stories: Story[] }) {
  if (!stories.length) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide">
      {stories.map((s) => (
        <button key={s.id} className="flex flex-col items-center gap-1 min-w-[64px]">
          <div
            className={cn(
              "w-14 h-14 rounded-full p-0.5",
              s.has_unseen ? "bg-gradient-to-tr from-coral via-warm-red to-champagne" : "bg-white/20"
            )}
          >
            <div className="w-full h-full rounded-full bg-onyx overflow-hidden border-2 border-onyx">
              {s.avatar_url ? (
                <img src={s.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-muted">
                  {(s.seller_username || "?")[0].toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <span className="text-[10px] text-muted truncate w-full text-center">{s.seller_username}</span>
        </button>
      ))}
    </div>
  );
}

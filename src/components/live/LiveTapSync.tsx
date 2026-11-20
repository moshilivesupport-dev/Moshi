
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Heart = {
  id: string;
  x: number;
  y: number;
  color: string;
};

type Props = {
  liveId: string;
};

const COLORS = ["#FF39B8", "#B026FF", "#FF58D0", "#A855F7"];

export default function LiveTapSync({ liveId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [hearts, setHearts] = useState<Heart[]>([]);

  useEffect(() => {
    if (!liveId) return;

    const channel = supabase.channel(`live-taps-${liveId}`, {
      config: {
        broadcast: { self: false },
      },
    });

    channel
      .on("broadcast", { event: "tap-heart" }, ({ payload }) => {
        const tap = payload as {
          x?: number;
          y?: number;
          color?: string;
          id?: string;
        };

        if (
          typeof tap.x !== "number" ||
          typeof tap.y !== "number"
        ) {
          return;
        }

        const heart: Heart = {
          id: tap.id || `${Date.now()}-${Math.random()}`,
          x: Math.max(0, Math.min(1, tap.x)),
          y: Math.max(0, Math.min(1, tap.y)),
          color: tap.color || COLORS[0],
        };

        setHearts((previous) => [...previous, heart]);

        window.setTimeout(() => {
          setHearts((previous) =>
            previous.filter((item) => item.id !== heart.id)
          );
        }, 2200);
      })
      .subscribe();

    const handleTap = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) return;

      if (
        target.closest("button") ||
        target.closest("input") ||
        target.closest("textarea") ||
        target.closest("a") ||
        target.closest("select") ||
        target.closest("[data-no-heart]")
      ) {
        return;
      }

      const color =
        COLORS[Math.floor(Math.random() * COLORS.length)];

      void channel.send({
        type: "broadcast",
        event: "tap-heart",
        payload: {
          id: `${Date.now()}-${Math.random()}`,
          x: event.clientX / Math.max(window.innerWidth, 1),
          y: event.clientY / Math.max(window.innerHeight, 1),
          color,
        },
      });
    };

    document.addEventListener("pointerdown", handleTap);

    return () => {
      document.removeEventListener("pointerdown", handleTap);
      void supabase.removeChannel(channel);
    };
  }, [liveId, supabase]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden">
      {hearts.map((heart) => (
        <div
          key={heart.id}
          className="absolute animate-float-heart"
          style={{
            left: `${heart.x * 100}%`,
            top: `${heart.y * 100}%`,
            transform: "translate(-50%, -50%)",
            filter: `drop-shadow(0 0 9px ${heart.color})`,
          }}
        >
          <svg
            width="38"
            height="38"
            viewBox="0 0 24 24"
            fill={heart.color}
          >
            <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
          </svg>
        </div>
      ))}
    </div>
  );
}

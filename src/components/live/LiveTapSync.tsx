
"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type TapHeart = {
  id: string;
  x: number;
  y: number;
  color: string;
};

type LiveTapSyncProps = {
  liveId: string;
};

export default function LiveTapSync({ liveId }: LiveTapSyncProps) {
  const [hearts, setHearts] = useState<TapHeart[]>([]);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

  useEffect(() => {
    if (!liveId) return;

    const supabase = createClient();
    supabaseRef.current = supabase;

    const channel = supabase.channel(`live-taps-${liveId}`, {
      config: {
        broadcast: {
          self: false,
        },
      },
    });

    const addHeart = (heart: TapHeart) => {
      setHearts((current) => [...current, heart]);

      window.setTimeout(() => {
        setHearts((current) =>
          current.filter((item) => item.id !== heart.id)
        );
      }, 2200);
    };

    channel
      .on("broadcast", { event: "tap-heart" }, ({ payload }) => {
        if (
          typeof payload?.x !== "number" ||
          typeof payload?.y !== "number"
        ) {
          return;
        }

        const x = Math.max(0, Math.min(1, payload.x));
        const y = Math.max(0, Math.min(1, payload.y));

        addHeart({
          id: `${Date.now()}-${Math.random()}`,
          x: x * window.innerWidth,
          y: y * window.innerHeight,
          color:
            typeof payload.color === "string"
              ? payload.color
              : "#F472B6",
        });
      })
      .subscribe();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) return;

      // Les cœurs ne sont diffusés que depuis la zone du live.
      if (!target.closest("[data-live-tap-area]")) return;

      // Ne pas compter les clics sur les commandes ou les champs.
      if (
        target.closest(
          "button, input, textarea, a, select, [data-no-heart]"
        )
      ) {
        return;
      }

      const x = event.clientX / window.innerWidth;
      const y = event.clientY / window.innerHeight;

      void channel.send({
        type: "broadcast",
        event: "tap-heart",
        payload: {
          x,
          y,
          color: "#F472B6",
        },
      });
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      void supabase.removeChannel(channel);
      supabaseRef.current = null;
    };
  }, [liveId]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[90] overflow-hidden"
      aria-hidden="true"
    >
      {hearts.map((heart) => (
        <div
          key={heart.id}
          className="absolute"
          style={{
            left: heart.x,
            top: heart.y,
            animation: "moshi-live-heart 2.2s ease-out forwards",
          }}
        >
          <svg
            width="42"
            height="42"
            viewBox="0 0 24 24"
            fill={heart.color}
            xmlns="http://www.w3.org/2000/svg"
            style={{
              filter: "drop-shadow(0 2px 8px rgba(236,72,153,0.55))",
            }}
          >
            <path d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A6 6 0 0 1 16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z" />
          </svg>
        </div>
      ))}

      <style jsx>{`
        @keyframes moshi-live-heart {
          0% {
            opacity: 0;
            transform: translate(-50%, -20%) scale(0.35) rotate(-12deg);
          }
          15% {
            opacity: 1;
            transform: translate(-50%, -60%) scale(1.15) rotate(8deg);
          }
          75% {
            opacity: 1;
            transform: translate(-50%, -190%) scale(1) rotate(-5deg);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -260%) scale(0.8) rotate(10deg);
          }
        }
      `}</style>
    </div>
  );
}

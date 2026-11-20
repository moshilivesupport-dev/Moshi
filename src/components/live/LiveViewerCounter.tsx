
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  liveId: string;
  currentUserId: string | null;
}

export default function LiveViewerCounter({
  liveId,
  currentUserId,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!liveId) return;

    const sessionId =
      currentUserId ||
      `guest-${Math.random().toString(36).slice(2)}-${Date.now()}`;

    const channel = supabase.channel(`live-viewer-count-${liveId}`, {
      config: {
        presence: {
          key: sessionId,
        },
      },
    });

    const updateCount = () => {
      const state = channel.presenceState();
      setCount(Object.keys(state).length);
    };

    channel
      .on("presence", { event: "sync" }, updateCount)
      .on("presence", { event: "join" }, updateCount)
      .on("presence", { event: "leave" }, updateCount)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: currentUserId,
            joined_at: new Date().toISOString(),
          });

          updateCount();
        }
      });

    return () => {
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [liveId, currentUserId, supabase]);

  return (
    <span className="tabular-nums">
      {count.toLocaleString("fr-FR")}
    </span>
  );
}

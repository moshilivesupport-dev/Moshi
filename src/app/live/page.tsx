import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Radio } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const supabase = await createClient();
  const { data: lives } = await supabase
    .from("live_streams")
    .select(
      `
      id, title, viewer_count, status,
      profiles:seller_id ( id, username, avatar_url, full_name )
    `
    )
    .eq("status", "live")
    .order("started_at", { ascending: false })
    .limit(40);

  return (
    <div className="min-h-[100dvh] bg-black text-white px-3 pt-6 pb-28">
      <div className="flex items-center justify-between mb-4 px-1">
        <h1 className="text-xl font-bold">Live</h1>
        <Link
          href="/seller/live"
          className="px-4 py-2 rounded-full bg-red-500 text-sm font-semibold"
        >
          Go LIVE
        </Link>
      </div>

      {!lives?.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Radio className="w-10 h-10 text-red-500 mb-3" />
          <p className="text-neutral-400 mb-4">Aucun live en cours</p>
          <Link
            href="/seller/live"
            className="px-6 py-2.5 rounded-full bg-red-500 text-sm font-semibold"
          >
            Lancer un live
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {lives.map((live: any) => {
            const p = Array.isArray(live.profiles)
              ? live.profiles[0]
              : live.profiles;
            return (
              <Link
                key={live.id}
                href={`/live/${live.id}`}
                className="relative aspect-[3/4] rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500">
                    LIVE
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-black/50">
                    {live.viewer_count || 0}
                  </span>
                </div>
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-xs font-semibold truncate">
                    @{p?.username || "user"}
                  </p>
                  <p className="text-[11px] text-white/80 line-clamp-2">
                    {live.title}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
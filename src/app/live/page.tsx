import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatNumber } from "@/lib/utils";
import { Users, Radio } from "lucide-react";

export default async function LiveFeedPage() {
  const supabase = await createClient();
  const { data: streams } = await supabase
    .from("live_streams")
    .select("id, title, viewer_count, thumbnail_url, status, profiles(username, avatar_url)")
    .eq("status", "live")
    .order("viewer_count", { ascending: false })
    .limit(20);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Radio className="w-6 h-6 text-coral" /> Lives en cours
        </h1>
      </div>

      {!streams || streams.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-muted">Aucun live en ce moment.</p>
          <p className="text-sm text-muted mt-2">Revenez plus tard ou suivez vos vendeurs préférés.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {streams.map((s: any) => (
            <Link key={s.id} href={`/live/${s.id}`} className="group">
              <div className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-anthracite">
                {s.thumbnail_url ? (
                  <img src={s.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-coral/20 to-onyx" />
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-coral rounded text-[10px] font-bold text-white">
                  LIVE
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-sm font-semibold text-white truncate">{s.title}</p>
                  <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                    <Users className="w-3 h-3" />
                    {formatNumber(s.viewer_count || 0)} · @{s.profiles?.username}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

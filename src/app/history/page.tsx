import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Simulation d'historique (à relier à votre table d'historique si vous en avez une)
  const { data: history } = await supabase
    .from("videos")
    .select("id, url, caption, view_count, created_at")
    .eq("user_id", user.id) // Pour l'exemple, on montre ses propres vidéos, adaptez selon votre logique d'historique
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center gap-3">
        <Link href="/profile/me" className="p-2 hover:bg-neutral-800 rounded-full"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-lg font-bold">Historique</h1>
      </header>

      <div className="p-4">
        {!history || history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
            <Clock className="w-16 h-16 mb-4 opacity-50" />
            <p>Aucun historique de visionnage.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((video: any) => (
              <Link key={video.id} href={`/videos/${video.id}`} className="flex gap-3 p-2 hover:bg-neutral-900 rounded-lg transition">
                <div className="w-24 h-32 bg-neutral-800 rounded-lg overflow-hidden flex-shrink-0">
                  <video src={video.url} className="w-full h-full object-cover" muted />
                </div>
                <div className="flex-1 py-1">
                  <p className="text-sm text-white line-clamp-2">{video.caption || "Sans description"}</p>
                  <p className="text-xs text-neutral-500 mt-2">{new Date(video.created_at).toLocaleDateString()}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

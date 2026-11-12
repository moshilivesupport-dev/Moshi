import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Bookmark } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Récupérer les vidéos sauvegardées (à adapter selon votre schema de sauvegarde)
  const { data: favorites } = await supabase
    .from("video_saves") // Assurez-vous que cette table existe, ou adaptez la requête
    .select("video_id, videos(url, caption, view_count)")
    .eq("user_id", user.id);

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center gap-3">
        <Link href="/profile/me" className="p-2 hover:bg-neutral-800 rounded-full"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-lg font-bold">Favoris</h1>
      </header>

      <div className="p-4">
        {!favorites || favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
            <Bookmark className="w-16 h-16 mb-4 opacity-50" />
            <p>Aucune vidéo sauvegardée pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {favorites.map((fav: any, idx: number) => (
              <Link key={idx} href={`/videos/${fav.video_id}`} className="relative aspect-[3/4] bg-neutral-800">
                <video src={fav.videos?.url} className="w-full h-full object-cover" muted />
                <div className="absolute bottom-1 left-1 flex items-center gap-1 text-white text-[10px]">
                  <span>▶</span> {fav.videos?.view_count || 0}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { Video, Radio, Trash2, Eye } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminContent() {
  const supabase = await createClient();

  // Récupérer les dernières vidéos
  const { data: videos } = await supabase
    .from("videos")
    .select(`
      id, 
      user_id, 
      caption, 
      view_count, 
      created_at, 
      profiles:user_id (username)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  // Récupérer les lives récents
  const { data: lives } = await supabase
    .from("live_sessions")
    .select(`
      id, 
      host_id, 
      title, 
      status, 
      viewers_count, 
      created_at, 
      profiles:host_id (username)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Modération du Contenu</h1>
        <p className="text-sm text-neutral-400 mt-1">Surveillez et modérez les vidéos et les lives.</p>
      </div>

      {/* Section Vidéos */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-neutral-800 flex items-center gap-2">
          <Video className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-semibold text-white">Vidéos Récentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-950 text-neutral-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Auteur</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Vues</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {videos?.map((video: any) => {
                // ✅ CORRECTION : profiles est un tableau, on prend le premier élément [0]
                const authorUsername = video.profiles?.[0]?.username || "Inconnu";
                
                return (
                  <tr key={video.id} className="hover:bg-neutral-800/50 transition">
                    <td className="px-6 py-4 text-white">@{authorUsername}</td>
                    <td className="px-6 py-4 text-neutral-300 max-w-xs truncate">{video.caption || "Aucune description"}</td>
                    <td className="px-6 py-4 text-neutral-400">{video.view_count || 0}</td>
                    <td className="px-6 py-4 text-neutral-400">{new Date(video.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/videos/${video.id}`} className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition" title="Voir">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-red-500 transition" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!videos || videos.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                    Aucune vidéo trouvée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section Lives */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-neutral-800 flex items-center gap-2">
          <Radio className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold text-white">Sessions Live Récentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-950 text-neutral-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Host</th>
                <th className="px-6 py-4">Titre</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Spectateurs</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {lives?.map((live: any) => {
                // ✅ CORRECTION : profiles est un tableau, on prend le premier élément [0]
                const hostUsername = live.profiles?.[0]?.username || "Inconnu";
                
                return (
                  <tr key={live.id} className="hover:bg-neutral-800/50 transition">
                    <td className="px-6 py-4 text-white">@{hostUsername}</td>
                    <td className="px-6 py-4 text-neutral-300 max-w-xs truncate">{live.title || "Sans titre"}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                        live.status === 'live' ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-neutral-700 text-neutral-300'
                      }`}>
                        {live.status === 'live' ? 'EN DIRECT' : 'TERMINÉ'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-400">{live.viewers_count || 0}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {live.status === 'live' && (
                          <Link href={`/live/${live.id}`} className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition" title="Rejoindre">
                            <Eye className="w-4 h-4" />
                          </Link>
                        )}
                        <button className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-red-500 transition" title="Supprimer la session">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!lives || lives.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                    Aucun live trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

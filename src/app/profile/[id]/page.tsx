import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, Edit3, Grid, Heart, Radio } from "lucide-react";

interface ProfilePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const supabase = await createClient();
  
  // Vérification de la session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect("/auth/login");
  }

  const { id } = await params;
  const targetId = id === "me" ? session.user.id : id;
  const isOwnProfile = session.user.id === targetId;

  // Récupération du profil
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", targetId)
    .single();

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Profil introuvable.</p>
      </div>
    );
  }

  // Récupération des vidéos de l'utilisateur
  const { data: userVideos } = await supabase
    .from("videos")
    .select("*")
    .eq("user_id", targetId)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-[100dvh] bg-black text-white px-4 py-8 max-w-md mx-auto pb-24">
      {/* En-tête du profil (Style TikTok) */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="w-24 h-24 rounded-full bg-neutral-800 flex items-center justify-center text-3xl font-bold border-2 border-red-500 overflow-hidden">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            profile.full_name?.[0] || profile.username?.[0] || "U"
          )}
        </div>
        
        <div>
          <h1 className="text-2xl font-bold">{profile.full_name || "Utilisateur Moshi"}</h1>
          <p className="text-sm text-neutral-400">@{profile.username || "username"}</p>
        </div>

        <div className="inline-block px-4 py-1.5 rounded-full bg-red-500/10 text-red-500 font-medium text-xs uppercase tracking-wider border border-red-500/20">
          {profile.role === "seller" ? "Compte Vendeur" : "Compte Acheteur"}
        </div>

        {/* Bio */}
        <p className="text-sm text-neutral-300 max-w-xs text-center">
          {profile.bio || "Aucune bio pour le moment."}
        </p>

        {/* Boutons d'action (Modifier / Paramètres si c'est notre profil) */}
        {isOwnProfile && (
          <div className="flex gap-2 w-full mt-4">
            <Link 
              href="/profile/edit" 
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-sm font-semibold transition"
            >
              <Edit3 className="w-4 h-4" /> Modifier le profil
            </Link>
            <Link 
              href="/settings" 
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-xl flex items-center justify-center transition"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        )}
      </div>

      {/* Statistiques rapides / Infos supplémentaires */}
      <div className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-left space-y-2 mt-6">
        <p className="text-xs text-neutral-400">Informations du compte</p>
        <div className="text-sm flex justify-between py-1 border-b border-neutral-800">
          <span className="text-neutral-400">Pays :</span>
          <span className="font-medium">{profile.country || "Non renseigné"}</span>
        </div>
        <div className="text-sm flex justify-between py-1">
          <span className="text-neutral-400">Date de naissance :</span>
          <span className="font-medium">{profile.birth_date || "Non renseignée"}</span>
        </div>
      </div>

      {/* Onglets de contenu (Vidéos publiées) */}
      <div className="mt-8">
        <div className="flex border-b border-neutral-800 mb-4">
          <div className="flex-1 pb-3 text-center border-b-2 border-white font-semibold text-sm flex items-center justify-center gap-2">
            <Grid className="w-4 h-4" /> Vidéos ({userVideos?.length || 0})
          </div>
        </div>

        {/* Grille des vidéos */}
        {userVideos && userVideos.length > 0 ? (
          <div className="grid grid-cols-3 gap-1">
            {userVideos.map((video) => (
              <Link 
                key={video.id} 
                href={`/videos/${video.id}`}
                className="relative aspect-[9/16] bg-neutral-900 overflow-hidden group rounded-md"
              >
                <img 
                  src={video.thumbnail_url || video.video_url} 
                  alt="Miniature vidéo" 
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300" 
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-end p-1.5">
                  <span className="text-[10px] font-semibold text-white bg-black/60 px-1.5 py-0.5 rounded">
                    ▶ {video.views_count || 0}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-neutral-500 text-sm">
            Aucune vidéo publiée pour le moment.
          </div>
        )}
      </div>
    </div>
  );
}

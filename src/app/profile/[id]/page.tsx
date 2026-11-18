import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileView from "@/components/profile/ProfileView";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Vérifier que l'ID est bien reçu
  console.log("ID du profil demandé :", id);

  // 2. Charger le profil
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, role, is_verified")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Erreur chargement profil :", error);
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-moshi-bg text-center">
        <h1 className="text-2xl font-bold text-red-500 mb-2">Erreur</h1>
        <p className="text-sm text-gray-600 mb-4">{error.message}</p>
        <p className="text-xs text-gray-400">Code : {error.code}</p>
      </div>
    );
  }

  if (!profile) {
    console.log("Aucun profil trouvé pour l'ID :", id);
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-moshi-bg text-center">
        <h1 className="text-2xl font-bold text-moshi-text mb-2">Profil introuvable</h1>
        <p className="text-sm text-gray-500">L'ID demandé est : {id}</p>
        <p className="text-xs text-gray-400 mt-2">Ce profil n'existe pas dans la base de données.</p>
      </div>
    );
  }

  // 3. Vérifier si c'est notre propre profil
  const { data: { user } } = await supabase.auth.getUser();
  const isOwnProfile = user?.id === profile.id;

  return <ProfileView profile={profile} isOwnProfile={isOwnProfile} />;
}
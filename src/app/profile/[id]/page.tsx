import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
// 👇 Correction de l'import : on importe le composant par défaut ET le type entre accolades
import ProfileView, { type ProfileData } from "@/components/profile/ProfileView";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Redirection si l'utilisateur demande son propre profil avec "me"
  if (id === "me") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login");
    redirect(`/profile/${user.id}`);
  }

  // Récupération des données du profil
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, role, created_at")
    .eq("id", id)
    .single();

  if (error || !profile) {
    notFound();
  }

  // Vérification si c'est le profil de l'utilisateur connecté
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwnProfile = user?.id === profile.id;

  // Comptage des vidéos publiques
  const { count: videosCount } = await supabase
    .from("videos")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("is_public", true);

  // Comptage des abonnés et abonnements
  let followers_count = 0;
  let following_count = 0;

  try {
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profile.id),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profile.id),
    ]);
    followers_count = followers || 0;
    following_count = following || 0;
  } catch {
    // La table 'follows' peut ne pas exister encore, on ignore l'erreur
  }

  return (
    <ProfileView
      profile={profile as ProfileData}
      isOwnProfile={isOwnProfile}
      stats={{
        videos_count: videosCount || 0,
        followers_count,
        following_count,
      }}
    />
  );
}

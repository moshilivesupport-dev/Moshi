import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileView from "@/components/profile/ProfileView";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProfilePage({ params }: PageProps) {
  const { id } = await params;

  if (id === "me" || id === "profile") {
    notFound();
  }

  const supabase = await createClient();

  // === VÉRIFIE D'ABORD SI L'UTILISATEUR EXISTE ===
  const {
    data: user,
    error: userError,
  } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (userError || !user) {
    notFound(); // ou tu peux renvoyer un profil vide + un message "Nouveau compte"
  }

  const {
    data: profile,
    error,
  } = await supabase
    .from("profiles")
    .select(
      "id, username, full_name, avatar_url, bio, role, is_verified"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Erreur chargement profil :", error);
    throw new Error("Impossible de charger ce profil.");
  }

  if (!profile) {
    notFound();
  }

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const isOwnProfile = currentUser?.id === profile.id;

  return (
    <ProfileView
      profile={profile}
      isOwnProfile={isOwnProfile}
    />
  );
}
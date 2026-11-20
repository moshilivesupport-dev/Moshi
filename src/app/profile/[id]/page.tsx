import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ProfileView from "@/components/profile/ProfileView";
import ProfileVisitTracker from "@/components/profile/ProfileVisitTracker";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface ProfileData {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string | null;
  is_verified: boolean;
  profile_views_count: number;
}

export default async function ProfilePage({ params }: PageProps) {
  const { id } = await params;

  if (id === "me" || id === "profile") {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: profile,
    error,
  } = await supabase
    .from("profiles")
    .select(
      "id, username, full_name, avatar_url, bio, role, is_verified, profile_views_count"
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
    data: { user },
  } = await supabase.auth.getUser();

  const isOwnProfile = user?.id === profile.id;
  const profileViewsCount = Number(profile.profile_views_count ?? 0);

  const profileData: ProfileData = {
    id: profile.id,
    username: profile.username,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    role: profile.role,
    is_verified: profile.is_verified,
    profile_views_count: profileViewsCount,
  };

  return (
    <>
      <ProfileVisitTracker
        profileId={profile.id}
        isOwnProfile={isOwnProfile}
      />

      <div className="mx-auto max-w-xl bg-moshi-bg px-4 pt-2">
        <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-moshi-text/70 shadow-sm">
          <Eye className="h-4 w-4 text-moshi-purple" />
          <span>
            {profileViewsCount.toLocaleString("fr-FR")} visite
            {profileViewsCount > 1 ? "s" : ""} du profil
          </span>
        </div>
      </div>

      <ProfileView
        profile={profileData}
        isOwnProfile={isOwnProfile}
      />
    </>
  );
}
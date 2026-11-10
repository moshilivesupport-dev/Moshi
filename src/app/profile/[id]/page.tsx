import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileView from "@/components/profile/ProfileView";
import type { ProfileData } from "@/components/profile/ProfileView";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Si l'id est "me", rediriger vers le vrai id
  if (id === "me") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login");
    redirect(`/profil/${user.id}`);
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, role, created_at")
    .eq("id", id)
    .single();

  if (error || !profile) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwnProfile = user?.id === profile.id;

  // Stats basiques (vidéos)
  const { count: videosCount } = await supabase
    .from("videos")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("is_public", true);

  return (
    <ProfileView
      profile={profile as ProfileData}
      isOwnProfile={isOwnProfile}
      stats={{
        videos_count: videosCount || 0,
        followers_count: 0, // à brancher plus tard
        following_count: 0,
      }}
    />
  );
}

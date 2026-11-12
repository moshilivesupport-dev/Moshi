import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileView, { type ProfileData } from "@/components/profile/ProfileView";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  if (id === "me") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/auth/login");
    redirect(`/profile/${user.id}`);
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, role, created_at")
    .eq("id", id)
    .single();

  if (error || !profile) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const isOwnProfile = user?.id === profile.id;

  // Compter les vidéos
  const { count: videosCount } = await supabase
    .from("videos")
    .select("*", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("status", "published");

  // Compter followers/following
  let followers_count = 0;
  let following_count = 0;
  try {
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
    ]);
    followers_count = followers || 0;
    following_count = following || 0;
  } catch {}

  return (
    <ProfileView
      profile={profile as ProfileData}
      isOwnProfile={isOwnProfile}
      initialStats={{
        videos_count: videosCount || 0,
        followers_count,
        following_count,
      }}
    />
  );
}

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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, role")
    .eq("id", id)
    .single();

  if (error || !profile) {
    notFound();
  }

  const { data: { user } } = await supabase.auth.getUser();
  const isOwnProfile = user?.id === profile.id;

  return <ProfileView profile={profile} isOwnProfile={isOwnProfile} />;
}
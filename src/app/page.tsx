import { createClient } from "@/lib/supabase/server";
import HomeFeed, { FeedItem } from "@/components/home/HomeFeed";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  // Récupérer les premiers éléments (vidéos publiques) directement côté serveur
  const { data: videos } = await supabase
    .from("videos")
    .select(`
      id, title, description, video_url, thumbnail_url,
      duration, views_count, likes_count, comments_count,
      created_at, user_id, profiles:user_id (id, username, full_name, avatar_url)
    `)
    .eq("is_public", true)
    .limit(20);

  const initialItems: FeedItem[] = (videos || []).map((v: any) => ({
    id: v.id,
    type: "video" as const,
    title: v.title,
    description: v.description || "",
    media_url: v.video_url,
    thumbnail_url: v.thumbnail_url,
    views_count: v.views_count,
    likes_count: v.likes_count,
    comments_count: v.comments_count,
    created_at: v.created_at,
    user_id: v.user_id,
    profiles: v.profiles,
  }));

  return (
    <main className="min-h-[100dvh] bg-black text-white overflow-hidden">
      <HomeFeed initialItems={initialItems} />
    </main>
  );
}

import { LivePlayer } from "@/components/live/LivePlayer";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

interface LivePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function LiveStreamPage({ params }: LivePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Récupération des détails du live et des infos vendeur
  const { data: stream, error } = await supabase
    .from("live_streams")
    .select(`
      id,
      title,
      seller_id,
      viewer_count,
      stream_url,
      status,
      profiles (
        id,
        username,
        avatar_url,
        followers_count
      )
    `)
    .eq("id", id)
    .single();

  if (error || !stream) {
    notFound();
  }

  // Récupération de l'utilisateur courant et des gifts actifs
  const [{ data: { user } }, { data: gifts }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("gifts").select("*").eq("is_active", true)
  ]);

  return (
    <main className="min-h-[100dvh] bg-black text-white">
      <div className="max-w-4xl mx-auto px-2 md:px-4 py-4">
        <LivePlayer
          stream={{
            id: stream.id,
            title: stream.title,
            seller_id: stream.seller_id,
            seller: Array.isArray(stream.profiles) ? stream.profiles[0] : stream.profiles,
            viewer_count: stream.viewer_count,
            stream_url: stream.stream_url,
            status: stream.status,
          }}
          currentUserId={user?.id}
          giftsCatalog={gifts || []}
        />
      </div>
    </main>
  );
}

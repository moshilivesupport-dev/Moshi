import { LivePlayer } from "@/components/live/LivePlayer";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function LiveStreamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: stream } = await supabase
    .from("live_streams")
    .select("*, profiles(username, avatar_url, followers_count)")
    .eq("id", id)
    .single();

  if (!stream) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: gifts } = await supabase.from("gifts").select("*").eq("is_active", true);

  return (
    <div className="max-w-4xl mx-auto px-2 md:px-4 py-4">
      <LivePlayer
        stream={{
          id: stream.id,
          title: stream.title,
          seller_id: stream.seller_id,
          seller: stream.profiles,
          viewer_count: stream.viewer_count,
          stream_url: stream.stream_url,
          status: stream.status,
        }}
        currentUserId={user?.id}
        giftsCatalog={gifts || []}
      />
    </div>
  );
}

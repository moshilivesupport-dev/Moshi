import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LiveRoom from "@/components/live/LiveRoom";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LivePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Charger le live
  const { data: live, error } = await supabase
    .from("live_sessions")
    .select(`
      id, title, host_id, host_role, status, room_name, product_ids,
      profiles:host_id (username, full_name, avatar_url)
    `)
    .eq("id", id)
    .single();

  if (error || !live) notFound();

  // Charger les produits si vendeur
  let products: any[] = [];
  if (live.product_ids && live.product_ids.length > 0) {
    const { data: productData } = await supabase
      .from("products")
      .select("id, title, price, currency, image_url")
      .in("id", live.product_ids);
    products = productData || [];
  }

  const roomName = live.room_name || `moshi-live-${live.id}`;
  const isHost = user?.id === live.host_id;
  const isSellerLive = live.host_role === "vendeur";

  return (
    <LiveRoom
      liveId={live.id}
      roomName={roomName}
      isHost={isHost}
      products={products}
      isSellerLive={isSellerLive}
    />
  );
}
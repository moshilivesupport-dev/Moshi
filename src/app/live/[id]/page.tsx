import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import LiveRoomClient from "./LiveRoomClient";

export const dynamic = "force-dynamic";

export default async function LivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Charger le live
  const { data: live, error } = await supabase
    .from("live_sessions")
    .select("id, title, host_id, host_role, status, room_name, product_ids")
    .eq("id", id)
    .single();

  if (error || !live) notFound();

  // 2. Charger les produits associés (si vendeur)
  let products: any[] = [];
  if (live.product_ids && live.product_ids.length > 0) {
    const { data: productData } = await supabase
      .from("products")
      .select("id, title, price, currency, image_url")
      .in("id", live.product_ids);
    products = productData || [];
  }

  // 3. Vérifier si l'utilisateur est l'hôte
  const { data: { user } } = await supabase.auth.getUser();
  const isHost = user?.id === live.host_id;

  return (
    <LiveRoomClient
      liveId={live.id}
      roomName={live.room_name || `moshi-live-${live.id}`}
      isHost={isHost}
      products={products}
      isSellerLive={live.host_role === "vendeur"}
    />
  );
}
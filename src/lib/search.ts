import { SupabaseClient } from "@supabase/supabase-js";

export interface SearchResults {
  profiles: any[];
  videos: any[];
  products: any[];
}

export async function searchAll(
  supabase: SupabaseClient,
  query: string,
  limit = 20
): Promise<SearchResults> {
  const q = query.trim();
  if (!q) {
    return { profiles: [], videos: [], products: [] };
  }

  const pattern = `%${q}%`;

  // 1. Profils
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, role")
    .or(`username.ilike.${pattern},full_name.ilike.${pattern}`)
    .limit(limit);

  // 2. Vidéos
  const { data: videos } = await supabase
    .from("videos")
    .select(`
      id, url, thumbnail_url, caption, view_count, like_count, created_at,
      profiles:user_id (id, username, full_name, avatar_url)
    `)
    .ilike("caption", pattern)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  // 3. Produits ✅ CORRECTION : title au lieu de name, pas d'image_url
  const { data: products } = await supabase
    .from("products")
    .select(`
      id, title, description, price, currency, seller_id, is_featured,
      profiles:seller_id (username, full_name)
    `)
    .or(`title.ilike.${pattern},description.ilike.${pattern}`)
    .eq("is_active", true)
    .limit(limit);

  return {
    profiles: profiles || [],
    videos: videos || [],
    products: products || [],
  };
}
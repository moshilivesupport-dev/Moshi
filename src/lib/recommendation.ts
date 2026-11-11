/**
 * Algorithme de recommandation – version simple & explicable
 *
 * Ce n'est PAS un modèle ML. C'est un score transparent basé sur :
 * - popularité (vues, likes)
 * - récence
 * - intérêts utilisateur (tags)
 * - abonnements
 *
 * Tu pourras plus tard brancher un vrai modèle (embeddings, etc.).
 */

import { createClient } from "@/lib/supabase/client";

export type ScoredVideo = {
  id: string;
  score: number;
  [key: string]: any;
};

export async function getRecommendedVideos(
  userId: string | null,
  limit = 30
): Promise<ScoredVideo[]> {
  const supabase = createClient();

  const { data: videos } = await supabase
    .from("videos")
    .select(
      `
      id, title, description, video_url, thumbnail_url,
      duration, views_count, likes_count, comments_count,
      created_at, user_id, sound_id,
      profiles:user_id (id, username, full_name, avatar_url)
    `
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!videos?.length) return [];

  const interests: Record<string, number> = {};
  let followingIds: string[] = [];

  if (userId) {
    const [{ data: interestRows }, { data: follows }] = await Promise.all([
      supabase.from("user_interests").select("tag, score").eq("user_id", userId),
      supabase.from("follows").select("following_id").eq("follower_id", userId),
    ]);

    (interestRows || []).forEach((r) => {
      interests[r.tag] = Number(r.score) || 1;
    });
    followingIds = (follows || []).map((f) => f.following_id);
  }

  const now = Date.now();
  const scored = videos.map((v: any) => {
    const ageHours = (now - new Date(v.created_at).getTime()) / 3_600_000;
    const recency = Math.max(0, 48 - ageHours) / 48;
    const popularity =
      Math.log10((v.views_count || 0) + 10) / 5 +
      Math.log10((v.likes_count || 0) + 5) / 4;

    const followingBoost = followingIds.includes(v.user_id) ? 0.35 : 0;

    let interestBoost = 0;
    const text = `${v.title || ""} ${v.description || ""}`.toLowerCase();
    Object.entries(interests).forEach(([tag, score]) => {
      if (text.includes(tag.toLowerCase())) interestBoost += score * 0.15;
    });

    const score =
      recency * 0.35 + popularity * 0.35 + followingBoost + interestBoost;

    return { ...v, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

export async function trackInterest(userId: string, tags: string[]) {
  if (!userId || !tags.length) return;
  const supabase = createClient();

  for (const tag of tags) {
    await supabase.from("user_interests").upsert(
      {
        user_id: userId,
        tag: tag.toLowerCase().slice(0, 40),
        score: 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,tag" }
    );
  }
}
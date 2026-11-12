import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Eye, Heart, Users, TrendingUp } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Statistiques globales du créateur
  const { data: videos } = await supabase.from("videos").select("view_count, like_count").eq("user_id", user.id);
  
  const totalViews = videos?.reduce((acc, curr) => acc + (curr.view_count || 0), 0) || 0;
  const totalLikes = videos?.reduce((acc, curr) => acc + (curr.like_count || 0), 0) || 0;

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center gap-3">
        <Link href="/profile/me" className="p-2 hover:bg-neutral-800 rounded-full"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-lg font-bold">Studio Créateur</h1>
      </header>

      <div className="p-4 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800">
            <div className="flex items-center gap-2 text-neutral-400 mb-2"><Eye className="w-4 h-4" /> Vues totales</div>
            <p className="text-2xl font-bold text-white">{totalViews.toLocaleString()}</p>
          </div>
          <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800">
            <div className="flex items-center gap-2 text-neutral-400 mb-2"><Heart className="w-4 h-4" /> Likes totaux</div>
            <p className="text-2xl font-bold text-white">{totalLikes.toLocaleString()}</p>
          </div>
          <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 col-span-2">
            <div className="flex items-center gap-2 text-neutral-400 mb-2"><TrendingUp className="w-4 h-4" /> Tendance</div>
            <p className="text-sm text-neutral-300">Vos vidéos ont gagné +12% de visibilité cette semaine.</p>
          </div>
        </div>

        <Link href="/videos/new" className="block w-full bg-red-500 hover:bg-red-600 text-white text-center py-3 rounded-xl font-bold transition">
          + Publier une nouvelle vidéo
        </Link>
      </div>
    </div>
  );
}

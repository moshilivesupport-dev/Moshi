import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Radio, Plus } from "lucide-react";
import LiveCard from "@/components/live/LiveCard";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Récupérer tous les lives en cours
  const { data: rawLives } = await supabase
    .from("live_sessions")
    .select(`
      id,
      title,
      room_name,
      thumbnail_url,
      viewers_count,
      started_at,
      host_role,
      profiles:host_id (
        id,
        username,
        full_name,
        avatar_url,
        role
      )
    `)
    .eq("status", "live")
    .order("viewers_count", { ascending: false });

  // 2. Formater les données : convertir le tableau 'profiles' en objet unique pour correspondre à l'interface LiveSession
  const lives = rawLives?.map((live: any) => ({
    ...live,
    profiles: live.profiles?.[0] || null,
  })) || [];

  // Vérifier si l'utilisateur est connecté
  let isSeller = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isSeller = profile?.role === "vendeur" || profile?.role === "admin";
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-neutral-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
              <Radio className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-bold">Lives en cours</h1>
          </div>
          {user && (
            <Link
              href="/live/new"
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-full text-sm font-bold transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Démarrer
            </Link>
          )}
        </div>
      </header>

      {/* Contenu */}
      <main className="px-4 py-6">
        {lives.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-neutral-900 flex items-center justify-center mb-4">
              <Radio className="w-10 h-10 text-neutral-600" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Aucun live en cours</h2>
            <p className="text-sm text-neutral-400 max-w-xs">
              {user
                ? "Soyez le premier à démarrer un live !"
                : "Connectez-vous pour voir les lives ou en démarrer un."}
            </p>
            {!user && (
              <Link href="/auth/login" className="mt-4 text-red-500 font-semibold text-sm">
                Se connecter
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Live "À la une" (le plus regardé) */}
            {lives.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3">
                  🔥 En vedette
                </h2>
                <Link href={`/live/${lives[0].id}`}>
                  <LiveCard session={lives[0]} featured />
                </Link>
              </div>
            )}

            {/* Grille des autres lives */}
            {lives.length > 1 && (
              <>
                <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-3">
                  Autres lives
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {lives.slice(1).map((session) => (
                    <Link key={session.id} href={`/live/${session.id}`}>
                      <LiveCard session={session} />
                    </Link>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

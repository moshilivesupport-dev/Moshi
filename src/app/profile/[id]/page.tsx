import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface ProfilePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const supabase = await createClient();
  
  // Vérification de la session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect("/auth/login");
  }

  const { id } = await params;

  // Récupération du profil
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id === "me" ? session.user.id : id)
    .single();

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Profil introuvable.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white px-4 py-8 max-w-md mx-auto">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-24 h-24 rounded-full bg-neutral-800 flex items-center justify-center text-3xl font-bold border-2 border-red-500">
          {profile.full_name?.[0] || profile.username?.[0] || "U"}
        </div>
        
        <div>
          <h1 className="text-2xl font-bold">{profile.full_name || "Utilisateur Moshi"}</h1>
          <p className="text-sm text-neutral-400">@{profile.username || "username"}</p>
        </div>

        <div className="inline-block px-4 py-1.5 rounded-full bg-red-500/10 text-red-500 font-medium text-xs uppercase tracking-wider border border-red-500/20">
          {profile.role === "seller" ? "Compte Vendeur" : "Compte Acheteur"}
        </div>

        <div className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-left space-y-2 mt-6">
          <p className="text-xs text-neutral-400">Informations du compte</p>
          <div className="text-sm flex justify-between py-1 border-b border-neutral-800">
            <span className="text-neutral-400">Pays :</span>
            <span className="font-medium">{profile.country || "Non renseigné"}</span>
          </div>
          <div className="text-sm flex justify-between py-1">
            <span className="text-neutral-400">Date de naissance :</span>
            <span className="font-medium">{profile.birth_date || "Non renseignée"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

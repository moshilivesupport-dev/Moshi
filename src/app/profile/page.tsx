import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProfileRedirectPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Si l'utilisateur n'est pas connecté, on l'envoie vers le login
  if (error || !user) {
    redirect("/auth/login");
  }

  // S'il est connecté, on le redirige vers son vrai profil avec son ID
  redirect(`/profile/${user.id}`);
}

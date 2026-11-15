import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MyProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Si pas connecté, on redirige vers l'accueil pour l'instant (on fera le login plus tard)
    redirect("/");
  }

  redirect(`/profile/${user.id}`);
}
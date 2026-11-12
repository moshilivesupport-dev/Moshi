import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  
  // 1. Vérifier l'authentification
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // 2. Vérifier le rôle Admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/"); // Redirige vers l'accueil si pas admin
  }

  return (
    <div className="flex h-[100dvh] bg-black text-white overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-neutral-800 bg-black/50 backdrop-blur-md flex items-center justify-between px-6">
          <h1 className="text-lg font-semibold">Panneau d'Administration</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-400 hidden sm:block">{user.email}</span>
            <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center text-xs font-bold text-red-500">
              A
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 bg-neutral-950">
          {children}
        </div>
      </main>
    </div>
  );
}

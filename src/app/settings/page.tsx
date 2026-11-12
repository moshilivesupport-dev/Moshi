import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Lock, Bell, Shield, LogOut } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center gap-3">
        <Link href="/profile/me" className="p-2 hover:bg-neutral-800 rounded-full"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-lg font-bold">Paramètres</h1>
      </header>

      <div className="p-4 space-y-6">
        <section>
          <h2 className="text-sm font-semibold text-neutral-400 mb-3 uppercase">Compte</h2>
          <div className="bg-neutral-900 rounded-xl overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 hover:bg-neutral-800 transition">
              <div className="flex items-center gap-3"><Lock className="w-5 h-5 text-neutral-400" /><span>Compte privé</span></div>
              <div className="w-10 h-6 bg-neutral-700 rounded-full relative"><div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" /></div>
            </button>
            <div className="h-px bg-neutral-800" />
            <button className="w-full flex items-center justify-between p-4 hover:bg-neutral-800 transition">
              <div className="flex items-center gap-3"><Shield className="w-5 h-5 text-neutral-400" /><span>Comptes bloqués</span></div>
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-neutral-400 mb-3 uppercase">Notifications</h2>
          <div className="bg-neutral-900 rounded-xl overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 hover:bg-neutral-800 transition">
              <div className="flex items-center gap-3"><Bell className="w-5 h-5 text-neutral-400" /><span>Push notifications</span></div>
              <div className="w-10 h-6 bg-red-500 rounded-full relative"><div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" /></div>
            </button>
          </div>
        </section>

        <button className="w-full flex items-center justify-center gap-2 p-4 bg-red-500/10 text-red-500 rounded-xl font-semibold hover:bg-red-500/20 transition">
          <LogOut className="w-5 h-5" /> Se déconnecter
        </button>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Video, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const links = [
    { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/admin/users", label: "Utilisateurs", icon: Users },
    { href: "/admin/content", label: "Contenu", icon: Video },
    { href: "/admin/settings", label: "Paramètres", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-black border-r border-neutral-800 flex flex-col flex-shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-neutral-800">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center font-bold text-white">
          M
        </div>
        <span className="ml-3 text-lg font-bold text-white">Moshi <span className="text-red-500 text-xs">ADMIN</span></span>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition",
                isActive 
                  ? "bg-red-500/10 text-red-500 border border-red-500/20" 
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              )}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-neutral-800">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-neutral-400 hover:bg-red-500/10 hover:text-red-500 transition"
        >
          <LogOut className="w-5 h-5" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}

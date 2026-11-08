import { SellerQueue } from "@/components/admin/SellerQueue";
import { AdminStats } from "@/components/admin/AdminStats";
import { StreamModeration } from "@/components/admin/StreamModeration";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, Users, Radio, Flag, Settings } from "lucide-react";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Shield className="w-12 h-12 text-muted mx-auto mb-3" />
        <p className="text-muted">Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  const [
    { count: totalUsers },
    { data: liveStreams },
    { data: pendingSellers },
    { count: totalOrders },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("live_streams")
      .select("id, title, status, viewer_count, profiles(username, avatar_url)")
      .eq("status", "live")
      .order("viewer_count", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, country, age, gender, seller_status, created_at")
      .eq("seller_status", "pending")
      .order("created_at", { ascending: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
  ]);

  const stats = {
    totalUsers: totalUsers || 0,
    liveStreams: liveStreams?.length || 0,
    pendingSellers: pendingSellers?.length || 0,
    totalOrders: totalOrders || 0,
    revenue: "—",
    reports: 0,
  };

  const nav = [
    { href: "/admin", label: "Vue d’ensemble", icon: Shield },
    { href: "/admin/users", label: "Utilisateurs", icon: Users },
    { href: "/admin/streams", label: "Lives", icon: Radio },
    { href: "/admin/disputes", label: "Litiges", icon: Flag },
    { href: "/admin/reports", label: "Signalements", icon: Flag },
    { href: "/admin/payouts", label: "Payouts", icon: Settings },
    { href: "/admin/settings", label: "Réglages", icon: Settings },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-2">
        <Shield className="w-7 h-7 text-champagne" />
        <h1 className="text-2xl font-bold text-white">Dashboard Admin</h1>
      </div>
      <p className="text-muted text-sm mb-6">Modération · Vendeurs · Lives · Utilisateurs</p>

      {/* Sub nav */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs text-muted hover:text-white transition flex-shrink-0"
          >
            <n.icon className="w-3.5 h-3.5" />
            {n.label}
          </Link>
        ))}
      </div>

      {/* Stats */}
      <section className="mb-10">
        <AdminStats stats={stats} />
      </section>

      {/* Pending sellers */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-champagne mb-4">
          Vendeurs en attente ({pendingSellers?.length || 0})
        </h2>
        <SellerQueue initialSellers={pendingSellers || []} />
      </section>

      {/* Live moderation */}
      <section>
        <h2 className="text-lg font-semibold text-coral mb-4 flex items-center gap-2">
          <Radio className="w-5 h-5" /> Lives en cours
        </h2>
        <StreamModeration
          initialStreams={(liveStreams || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            status: s.status,
            viewer_count: s.viewer_count,
            seller: s.profiles,
          }))}
        />
      </section>
    </div>
  );
}

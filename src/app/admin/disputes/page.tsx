import { DisputeQueue } from "@/components/admin/DisputeQueue";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";

export default async function AdminDisputesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, subject, category, description, status, priority, created_at, profiles!support_tickets_user_id_fkey(username, full_name, email)")
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: true });

  const mapped = (tickets || []).map((t: any) => ({
    ...t,
    user: t.profiles,
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-muted hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> Retour Admin
      </Link>
      <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-coral" /> Support & Litiges
      </h1>
      <p className="text-muted text-sm mb-8">
        Demandes envoyées par les acheteurs et vendeurs
      </p>
      <DisputeQueue initialTickets={mapped} />
    </div>
  );
}

import { StreamModeration } from "@/components/admin/StreamModeration";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function AdminStreamsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const { data: streams } = await supabase
    .from("live_streams")
    .select("id, title, status, viewer_count, profiles(username, avatar_url)")
    .in("status", ["live", "scheduled"])
    .order("viewer_count", { ascending: false });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-muted hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> Retour Admin
      </Link>
      <h1 className="text-2xl font-bold text-white mb-6">Modération des lives</h1>
      <StreamModeration
        initialStreams={(streams || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          status: s.status,
          viewer_count: s.viewer_count,
          seller: s.profiles,
        }))}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import ConversationList from "@/components/messages/ConversationList";
import StoriesBar from "@/components/stories/StoriesBar";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Messages</h1>
        <Link href="/messages/new" className="text-red-500 font-semibold text-sm">
          Nouveau
        </Link>
      </header>

      {/* ✅ BARRE DE STORIES */}
      <StoriesBar currentUserId={user.id} />

      {/* Liste des conversations */}
      <main className="px-4 py-2">
        <ConversationList userId={user.id} />
      </main>
    </div>
  );
}
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatThread from "@/components/messages/ChatThread";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function ChatPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Vérifier que l'utilisateur fait partie de la conversation
  const { data: participation } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .single();

  if (!participation) notFound();

  return (
    <div className="h-[100dvh] bg-black text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center gap-3">
        <Link href="/messages" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-800 transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        {/* On pourrait afficher le nom de l'autre user ici via un fetch */}
        <h1 className="text-lg font-semibold flex-1">Discussion</h1>
      </header>

      {/* Thread */}
      <ChatThread conversationId={id} currentUserId={user.id} />
    </div>
  );
}

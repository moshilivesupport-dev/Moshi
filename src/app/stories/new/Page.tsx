import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StoryForm } from "@/components/social/StoryForm";
import { ChevronLeft } from "lucide-react";

export default async function NewStoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <Link href="/stories" className="inline-flex items-center gap-1 text-sm text-muted hover:text-white mb-4">
        <ChevronLeft className="w-4 h-4" /> Stories
      </Link>
      <h1 className="text-2xl font-bold text-white mb-4">Nouvelle story</h1>
      <StoryForm userId={user.id} />
    </div>
  );
}

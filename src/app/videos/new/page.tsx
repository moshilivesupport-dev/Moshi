import { VideoUploadForm } from "@/components/video/VideoUploadForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewVideoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <Link
        href="/videos"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Feed vidéos
      </Link>
      <h1 className="text-2xl font-bold text-white mb-2">Publier une vidéo</h1>
      <p className="text-sm text-muted mb-8">
        Acheteurs et vendeurs · maximum{" "}
        <span className="text-coral font-semibold">45 secondes</span>
      </p>
      <VideoUploadForm userId={user.id} />
    </div>
  );
}

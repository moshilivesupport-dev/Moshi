import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VideoUploadForm from "@/components/video/VideoUploadForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewVideoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/videos/new");
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-black/80 backdrop-blur border-b border-neutral-800">
        <Link
          href="/videos"
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-800 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold">Nouvelle vidéo</h1>
      </header>

      <main className="px-4 py-6">
        <p className="text-sm text-neutral-400 mb-6 text-center">
          Maximum <span className="text-white font-medium">45 secondes</span> ·
          MP4, WebM ou MOV
        </p>

        <VideoUploadForm />
      </main>
    </div>
  );
}

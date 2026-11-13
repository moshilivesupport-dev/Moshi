import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VideoUploadForm from "@/components/video/VideoUploadForm";

export const dynamic = "force-dynamic";

export default async function NewVideoPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-[100dvh] bg-black flex items-center justify-center px-4 py-8">
      <main className="w-full max-w-md">
        <VideoUploadForm />
      </main>
    </div>
  );
}
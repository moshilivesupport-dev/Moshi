import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotificationList from "@/components/notifications/NotificationList";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-neutral-800 px-4 py-3">
        <h1 className="text-xl font-bold">Notifications</h1>
      </header>

      {/* Liste */}
      <main className="px-4 py-2">
        <NotificationList userId={user.id} />
      </main>
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { Sparkles } from "lucide-react";

interface StoryRow {
  id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  expires_at: string;
  profiles: { username: string | null } | { username: string | null }[] | null;
}

export default async function StoriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let canCreate = false;
  if (user) {
    const { data: p } = await supabase.from("profiles").select("role, seller_status").eq("id", user.id).maybeSingle();
    canCreate = p?.role === "admin" || (p?.role === "seller" && p?.seller_status === "approved");
  }

  const { data } = await supabase
    .from("stories")
    .select("id, media_url, media_type, caption, expires_at, profiles(username)")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(60);
  const stories = (data || []) as unknown as StoryRow[];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Stories</h1>
        {canCreate && (
          <Link href="/stories/new">
            <Button size="sm" variant="gold">
              <Sparkles className="w-4 h-4 mr-1.5" /> Ajouter
            </Button>
          </Link>
        )}
      </div>

      {stories.length === 0 ? (
        <div className="card text-center py-12 text-muted text-sm">
          Aucune story pour le moment.
          <br />
          <span className="text-xs">Les stories disparaissent après 24 h.</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {stories.map((s) => {
            const author = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
            const hours = Math.max(1, Math.ceil((new Date(s.expires_at).getTime() - Date.now()) / 3600000));
            return (
              <div key={s.id} className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-onyx border border-white/5">
                {s.media_type === "video" ? (
                  <video src={s.media_url} className="w-full h-full object-cover" muted playsInline controls preload="metadata" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.media_url} alt={s.caption || "Story"} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
                  <p className="text-sm font-semibold text-white">@{author?.username || "vendeur"}</p>
                  {s.caption && <p className="text-xs text-white/80 line-clamp-2">{s.caption}</p>}
                  <p className="text-[10px] text-white/50 mt-0.5">encore {hours} h</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

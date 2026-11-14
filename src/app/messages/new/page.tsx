"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Search, ChevronLeft, Loader2 } from "lucide-react";

export default function NewMessagePage() {
  const router = useRouter();
  const supabase = createClient();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .neq("id", user.id)
        .limit(20);

      setUsers(data || []);
      setLoading(false);
    };
    loadUsers();
  }, [supabase, router]);

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      <header className="sticky top-0 z-30 bg-black flex items-center gap-2 px-2 py-3 border-b border-neutral-800">
        <button onClick={() => router.back()} className="p-2">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-semibold">Nouveau message</h1>
      </header>

      <div className="p-4">
        <div className="flex items-center bg-neutral-900 rounded-full px-4 py-2 mb-4">
          <Search className="w-4 h-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-white text-sm ml-2 outline-none"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-neutral-500 animate-spin" /></div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => router.push(`/messages/${u.id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-800">
                  {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : null}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold">{u.full_name || u.username}</p>
                  <p className="text-xs text-neutral-400">@{u.username}</p>
                </div>
              </button>
            ))}
            {filteredUsers.length === 0 && (
              <p className="text-center text-neutral-500 text-sm py-10">Aucun utilisateur trouvé.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Shield, Ban, CheckCircle } from "lucide-react";

interface UserRow {
  id: string;
  username: string;
  full_name?: string;
  email?: string;
  role: string;
  seller_status: string;
  is_verified: boolean;
  created_at: string;
}

export function UserManagement({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const supabase = createClient();

  const setRole = async (id: string, role: string) => {
    setLoadingId(id);
    try {
      await supabase.from("profiles").update({ role }).eq("id", id);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-2">
      {users.map((u) => (
        <div key={u.id} className="card flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {u.full_name || u.username} <span className="text-muted">@{u.username}</span>
            </p>
            <p className="text-xs text-muted">{u.email}</p>
            <div className="flex gap-2 mt-1 text-[10px]">
              <span className="px-1.5 py-0.5 rounded bg-white/10 capitalize">{u.role}</span>
              <span className="px-1.5 py-0.5 rounded bg-white/10 capitalize">{u.seller_status}</span>
              {u.is_verified && <span className="text-green-400">✓ vérifié</span>}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {u.role !== "admin" && (
              <Button size="sm" variant="outline" loading={loadingId === u.id} onClick={() => setRole(u.id, "admin")}>
                <Shield className="w-3.5 h-3.5 mr-1" /> Admin
              </Button>
            )}
            {u.role === "admin" && (
              <Button size="sm" variant="ghost" loading={loadingId === u.id} onClick={() => setRole(u.id, "buyer")}>
                Rétrograder
              </Button>
            )}
          </div>
        </div>
      ))}
      {users.length === 0 && <div className="card text-center py-10 text-muted text-sm">Aucun utilisateur</div>}
    </div>
  );
}

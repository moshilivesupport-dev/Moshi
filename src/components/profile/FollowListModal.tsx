
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Search, Loader2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface FollowListModalProps {
  profileId: string;
  type: "followers" | "following";
  onClose: () => void;
}

interface FollowUser {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export default function FollowListModal({
  profileId,
  type,
  onClose,
}: FollowListModalProps) {
  const supabase = useMemo(() => createClient(), []);
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadUsers() {
      setLoading(true);
      setError("");

      const column =
        type === "followers" ? "follower_id" : "following_id";

      const filterColumn =
        type === "followers" ? "following_id" : "follower_id";

      const { data: relations, error: relationError } = await supabase
        .from("follows")
        .select(column)
        .eq(filterColumn, profileId)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!active) return;

      if (relationError) {
        setError("Impossible de charger cette liste.");
        setLoading(false);
        return;
      }

      const ids = Array.from(
        new Set(
          (relations ?? [])
            .map((relation) =>
              (relation as Record<string, string>)[column]
            )
            .filter(Boolean)
        )
      );

      if (ids.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", ids);

      if (!active) return;

      if (profilesError) {
        setError("Impossible de charger les profils.");
        setLoading(false);
        return;
      }

      const profileMap = new Map(
        (profiles ?? []).map((profile) => [profile.id, profile])
      );

      setUsers(
        ids
          .map((id) => profileMap.get(id))
          .filter((profile): profile is FollowUser => Boolean(profile))
      );

      setLoading(false);
    }

    void loadUsers();

    return () => {
      active = false;
    };
  }, [profileId, type, supabase]);

  const filteredUsers = users.filter((user) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      (user.username ?? "").toLowerCase().includes(query) ||
      (user.full_name ?? "").toLowerCase().includes(query)
    );
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={type === "followers" ? "Abonnés" : "Abonnements"}
        className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {type === "followers" ? "Abonnés" : "Abonnements"}
            </h2>
            <p className="text-xs text-gray-500">
              {users.length} compte{users.length > 1 ? "s" : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full bg-gray-100 p-2"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="p-4">
          <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2.5">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un compte..."
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-purple-500" />
            </div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-red-500">
              {error}
            </p>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Users className="mb-3 h-9 w-9 text-gray-300" />
              <p className="text-sm text-gray-500">
                {search
                  ? "Aucun compte trouvé."
                  : "Cette liste est vide pour le moment."}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map((user) => {
                const name =
                  user.full_name || user.username || "Utilisateur";

                return (
                  <Link
                    key={user.id}
                    href={`/profile/${user.id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-gray-50"
                  >
                    {user.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt=""
                        width={44}
                        height={44}
                        unoptimized
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-100 font-bold text-purple-600">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {name}
                      </p>
                      {user.username && (
                        <p className="truncate text-xs text-gray-500">
                          @{user.username}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

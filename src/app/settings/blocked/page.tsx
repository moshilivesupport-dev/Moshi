
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Ban,
  Loader2,
  UserRound,
  UserX,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface BlockedProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export default function BlockedUsersPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [users, setUsers] = useState<BlockedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadBlockedUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        router.replace("/auth/login");
        return;
      }

      setUserId(user.id);

      const { data: blocks, error: blocksError } = await supabase
        .from("user_blocks")
        .select("blocked_id, created_at")
        .eq("blocker_id", user.id)
        .order("created_at", { ascending: false });

      if (blocksError) throw blocksError;

      const blockedIds = (blocks ?? []).map((item) => item.blocked_id);

      if (blockedIds.length === 0) {
        setUsers([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", blockedIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(
        (profiles ?? []).map((profile) => [profile.id, profile])
      );

      setUsers(
        blockedIds
          .map((id) => profileMap.get(id))
          .filter((profile): profile is BlockedProfile => Boolean(profile))
      );
    } catch (err) {
      console.error("Chargement des comptes bloqués :", err);
      setError("Impossible de charger les comptes bloqués.");
    } finally {
      setLoading(false);
    }
  }, [router, supabase]);

  useEffect(() => {
    void loadBlockedUsers();
  }, [loadBlockedUsers]);

  async function handleUnblock(blockedId: string) {
    if (!userId || unblockingId) return;

    const confirmed = window.confirm(
      "Veux-tu vraiment débloquer cet utilisateur ?"
    );

    if (!confirmed) return;

    setUnblockingId(blockedId);
    setError("");
    setSuccess("");

    try {
      const { error: deleteError } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", userId)
        .eq("blocked_id", blockedId);

      if (deleteError) throw deleteError;

      setUsers((current) =>
        current.filter((profile) => profile.id !== blockedId)
      );

      setSuccess("Utilisateur débloqué.");
    } catch (err) {
      console.error("Déblocage impossible :", err);
      setError("Impossible de débloquer cet utilisateur.");
    } finally {
      setUnblockingId(null);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-moshi-bg pb-10">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-purple-100 bg-white/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => router.push("/settings")}
          aria-label="Retour aux paramètres"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50"
        >
          <ArrowLeft className="h-5 w-5 text-gray-800" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold text-gray-900">
            Utilisateurs bloqués
          </h1>
          <p className="text-xs text-gray-500">
            Gère les comptes que tu as bloqués
          </p>
        </div>

        <Ban className="h-6 w-6 text-red-500" />
      </header>

      <div className="mx-auto max-w-xl space-y-4 px-4 py-5">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <Ban className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-bold text-red-800">
                À propos du blocage
              </p>
              <p className="mt-1 text-xs leading-relaxed text-red-700">
                Les comptes bloqués ne peuvent plus créer de nouvelles
                conversations avec toi ni établir un nouvel abonnement
                entre vos deux comptes.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-100 bg-green-50 p-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <Loader2 className="h-8 w-8 animate-spin text-moshi-purple" />
            <p className="text-sm text-gray-500">
              Chargement des comptes bloqués...
            </p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-6 py-16 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-50">
              <UserX className="h-8 w-8 text-moshi-purple" />
            </div>

            <h2 className="mt-4 text-base font-bold text-gray-900">
              Aucun utilisateur bloqué
            </h2>

            <p className="mt-2 max-w-xs text-sm text-gray-500">
              Les comptes que tu bloques apparaîtront ici. Tu pourras
              les débloquer à tout moment.
            </p>

            <Link
              href="/"
              className="mt-5 rounded-full moshi-gradient px-6 py-2.5 text-sm font-bold text-white"
            >
              Retour à l'accueil
            </Link>
          </div>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-bold text-gray-900">
                {users.length} compte{users.length > 1 ? "s" : ""} bloqué
                {users.length > 1 ? "s" : ""}
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {users.map((profile) => {
                const name =
                  profile.full_name || profile.username || "Utilisateur";

                return (
                  <div
                    key={profile.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-purple-50">
                      {profile.avatar_url ? (
                        <Image
                          src={profile.avatar_url}
                          alt={name}
                          fill
                          sizes="48px"
                          unoptimized
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <UserRound className="h-6 w-6 text-moshi-purple" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-gray-900">
                        {name}
                      </p>
                      {profile.username && (
                        <p className="truncate text-xs text-gray-500">
                          @{profile.username}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleUnblock(profile.id)}
                      disabled={unblockingId !== null}
                      className="shrink-0 rounded-full border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {unblockingId === profile.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Débloquer"
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

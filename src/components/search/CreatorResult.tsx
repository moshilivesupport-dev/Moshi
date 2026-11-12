"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserPlus, Check } from "lucide-react";

interface CreatorResultProps {
  creator: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  };
}

export default function CreatorResult({ creator }: CreatorResultProps) {
  const supabase = createClient();
  const [following, setFollowing] = useState(false);

  const toggleFollow = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setFollowing(!following);

    if (!following) {
      await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: creator.id,
      });
    } else {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", creator.id);
    }
  };

  const name = creator.username || creator.full_name || "Utilisateur";

  return (
    <Link
      href={`/profile/${creator.id}`}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-900 transition-colors"
    >
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0">
        {creator.avatar_url ? (
          <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-bold text-neutral-500">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white truncate">{name}</h3>
        {creator.bio && (
          <p className="text-xs text-neutral-400 truncate mt-0.5">{creator.bio}</p>
        )}
      </div>

      {/* Bouton Follow */}
      <button
        onClick={(e) => {
          e.preventDefault();
          toggleFollow();
        }}
        className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
          following
            ? "bg-neutral-700 text-white"
            : "bg-red-500 text-white hover:bg-red-600"
        }`}
      >
        {following ? (
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3" />
            Suivi
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <UserPlus className="w-3 h-3" />
            Suivre
          </span>
        )}
      </button>
    </Link>
  );
}

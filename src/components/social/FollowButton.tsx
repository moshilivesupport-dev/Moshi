"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";

interface FollowButtonProps {
  targetUserId: string;
  currentUserId?: string;
  variant?: "default" | "profile" | "small";
  onFollowChange?: (isFollowing: boolean) => void; // ✅ NOUVEAU
}

export default function FollowButton({ targetUserId, currentUserId, variant = "profile", onFollowChange }: FollowButtonProps) {
  const supabase = createClient();
  const router = useRouter();
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(currentUserId || null);

  useEffect(() => {
    if (!currentUser) {
      const getUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
      };
      getUser();
    }
  }, [currentUser, supabase]);

  useEffect(() => {
    if (!currentUser || currentUser.id === targetUserId) {
      setChecking(false);
      return;
    }

    const checkFollow = async () => {
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUser.id)
        .eq("following_id", targetUserId)
        .maybeSingle();
      
      setIsFollowing(!!data);
      setChecking(false);
    };
    checkFollow();
  }, [currentUser, targetUserId, supabase]);

  const handleFollow = async () => {
    if (!currentUser) {
      router.push("/auth/login");
      return;
    }

    if (currentUser.id === targetUserId) {
      alert("Vous ne pouvez pas vous abonner à vous-même !");
      return;
    }

    setLoading(true);

    try {
      if (isFollowing) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", targetUserId);
        setIsFollowing(false);
        onFollowChange?.(false); // ✅ Notifie le parent
      } else {
        await supabase
          .from("follows")
          .insert({
            follower_id: currentUser.id,
            following_id: targetUserId,
          });
        setIsFollowing(true);
        onFollowChange?.(true); // ✅ Notifie le parent
      }
    } catch (err) {
      console.error("Erreur follow:", err);
      alert("Une erreur est survenue");
    }

    setLoading(false);
  };

  if (currentUser?.id === targetUserId) return null;

  if (!currentUser) {
    return (
      <button onClick={handleFollow} className={`flex items-center justify-center gap-2 font-semibold transition active:scale-95 bg-red-500 hover:bg-red-600 text-white ${variant === "small" ? "px-3 py-1.5 rounded-full text-xs" : variant === "profile" ? "py-2.5 rounded-lg text-sm" : "px-4 py-2 rounded-full text-sm"}`}>
        <UserPlus className={variant === "small" ? "w-3 h-3" : "w-4 h-4"} />
        S'abonner
      </button>
    );
  }

  if (checking) {
    return (
      <button disabled className={`flex items-center justify-center gap-2 font-semibold bg-neutral-700 text-neutral-400 ${variant === "small" ? "px-3 py-1.5 rounded-full text-xs" : variant === "profile" ? "py-2.5 rounded-lg text-sm" : "px-4 py-2 rounded-full text-sm"}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </button>
    );
  }

  return (
    <button onClick={handleFollow} disabled={loading} className={`flex items-center justify-center gap-2 font-semibold transition active:scale-95 disabled:opacity-70 ${isFollowing ? (variant === "small" ? "bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-1.5 rounded-full text-xs" : variant === "profile" ? "bg-neutral-800 hover:bg-neutral-700 text-white py-2.5 rounded-lg text-sm border border-neutral-700" : "bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded-full text-sm") : (variant === "small" ? "bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-full text-xs" : variant === "profile" ? "bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg text-sm" : "bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full text-sm")}`}>
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserCheck className={variant === "small" ? "w-3 h-3" : "w-4 h-4"} />
          {variant === "small" ? "Suivi" : "Abonné"}
        </>
      ) : (
        <>
          <UserPlus className={variant === "small" ? "w-3 h-3" : "w-4 h-4"} />
          S'abonner
        </>
      )}
    </button>
  );
}

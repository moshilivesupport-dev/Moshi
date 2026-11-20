"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface ProfileVisitTrackerProps {
  profileId: string;
  isOwnProfile: boolean;
}

export default function ProfileVisitTracker({
  profileId,
  isOwnProfile,
}: ProfileVisitTrackerProps) {
  useEffect(() => {
    if (isOwnProfile || !profileId) return;

    let cancelled = false;

    async function recordVisit() {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (cancelled || authError || !user) return;
      if (user.id === profileId) return;

      const viewedOn = new Date().toISOString().slice(0, 10);

      const { error } = await supabase
        .from("profile_views")
        .insert({
          profile_id: profileId,
          visitor_id: user.id,
          viewed_on: viewedOn,
        });

      if (cancelled) return;

      // Une visite déjà enregistrée aujourd'hui est normale.
      if (error && error.code !== "23505") {
        console.error("Erreur enregistrement visite profil :", error);
      }
    }

    void recordVisit();

    return () => {
      cancelled = true;
    };
  }, [profileId, isOwnProfile]);

  return null;
}
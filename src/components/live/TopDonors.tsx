"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trophy, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TopDonor {
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_coins: number;
  rank: number;
}

interface TopDonorsProps {
  sessionId: string;
}

export default function TopDonors({ sessionId }: TopDonorsProps) {
  const supabase = createClient();
  const [donors, setDonors] = useState<TopDonor[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadDonors = async () => {
      // Récupérer les cadeaux de cette session, grouper par sender
      const { data: gifts } = await supabase
        .from("live_gifts")
        .select(`
          sender_id,
          coin_cost,
          profiles:sender_id (username, avatar_url)
        `)
        .eq("session_id", sessionId);

      if (!gifts) return;

      // Agrégation manuelle (en prod, utiliser une vue SQL)
      const aggregated: Record<string, { total: number; profile: any }> = {};
      gifts.forEach((g: any) => {
        const uid = g.sender_id;
        if (!aggregated[uid]) {
          aggregated[uid] = { total: 0, profile: g.profiles };
        }
        aggregated[uid].total += g.coin_cost;
      });

      const sorted = Object.entries(aggregated)
        .map(([user_id, data]) => ({
          user_id,
          username: data.profile?.username || "Anonyme",
          avatar_url: data.profile?.avatar_url,
          total_coins: data.total,
        }))
        .sort((a, b) => b.total_coins - a.total_coins)
        .slice(0, 10)
        .map((d, idx) => ({ ...d, rank: idx + 1 }));

      setDonors(sorted);
    };

    loadDonors();

    // Refresh toutes les 10s
    const interval = setInterval(loadDonors, 10000);
    return () => clearInterval(interval);
  }, [sessionId, supabase]);

  if (donors.length === 0) return null;

  return (
    <div className="absolute top-20 right-4 z-30">
      {/* Bouton toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md border border-yellow-500/30 px-3 py-1.5 rounded-full hover:bg-black/70 transition"
      >
        <Trophy className="w-3.5 h-3.5 text-yellow-500" />
        <span className="text-xs font-bold text-white">Top</span>
      </button>

      {/* Panneau des donateurs */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className="absolute top-10 right-0 w-64 bg-black/80 backdrop-blur-md border border-neutral-800 rounded-2xl p-3 shadow-2xl"
          >
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-neutral-800">
              <Crown className="w-4 h-4 text-yellow-500" />
              <h3 className="text-sm font-bold text-white">Top contributeurs</h3>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {donors.map((donor) => (
                <div
                  key={donor.user_id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-neutral-900/50"
                >
                  {/* Rang */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    donor.rank === 1 ? "bg-yellow-500 text-black" :
                    donor.rank === 2 ? "bg-neutral-400 text-black" :
                    donor.rank === 3 ? "bg-orange-600 text-white" :
                    "bg-neutral-800 text-neutral-400"
                  }`}>
                    {donor.rank}
                  </div>

                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0">
                    {donor.avatar_url ? (
                      <img src={donor.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                        {donor.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">
                      {donor.username}
                    </p>
                    <p className="text-[10px] text-yellow-500 font-bold">
                      {donor.total_coins.toLocaleString("fr-FR")} 🪙
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

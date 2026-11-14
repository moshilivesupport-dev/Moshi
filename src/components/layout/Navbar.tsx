"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Home, Radio, Plus, ShoppingBag, User, Video, Image as ImageIcon, X, Bell
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export default function Navbar({ role = "acheteur" }: { role?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // ✅ Vérifier les notifications non lues
  useEffect(() => {
    const checkNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("to_user_id", user.id)
        .eq("read", false);

      setUnreadCount(count || 0);
    };
    
    checkNotifications();
    const interval = setInterval(checkNotifications, 30000); // Toutes les 30s
    return () => clearInterval(interval);
  }, [supabase]);

  return (
    <>
      {/* ===== MENU CRÉER (Bottom Sheet) ===== */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 z-[55] backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[56] bg-[#121212] rounded-t-3xl pb-8 px-4"
            >
              <div className="w-12 h-1.5 bg-neutral-700 rounded-full mx-auto mt-3 mb-6" />

              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white text-xl font-bold">Créer</h2>
                <button onClick={() => setIsMenuOpen(false)} className="text-neutral-400 p-2">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    router.push("/create");
                  }}
                  className="flex flex-col items-center justify-center bg-neutral-900 rounded-2xl p-4 gap-2 border border-neutral-800 active:scale-95 transition"
                >
                  <div className="w-12 h-12 rounded-full bg-pink-500 flex items-center justify-center mb-1">
                    <Video className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-white font-semibold text-sm">Vidéo</span>
                  <span className="text-neutral-500 text-[10px] text-center leading-tight">Publier une vidéo courte</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    router.push("/live");
                  }}
                  className="flex flex-col items-center justify-center bg-neutral-900 rounded-2xl p-4 gap-2 border border-neutral-800 active:scale-95 transition"
                >
                  <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center mb-1">
                    <Radio className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-white font-semibold text-sm">Live</span>
                  <span className="text-neutral-500 text-[10px] text-center leading-tight">Passer en direct</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    router.push("/stories/new");
                  }}
                  className="flex flex-col items-center justify-center bg-neutral-900 rounded-2xl p-4 gap-2 border border-neutral-800 active:scale-95 transition"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center mb-1">
                    <ImageIcon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-white font-semibold text-sm">Story</span>
                  <span className="text-neutral-500 text-[10px] text-center leading-tight">Story 24 h</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ===== BARRE DE NAVIGATION FIXE ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-neutral-800 safe-area-bottom">
        <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
          
          <Link href="/" className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 text-neutral-400 hover:text-white transition">
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-medium">Accueil</span>
          </Link>

          <button
            onClick={() => {
              if (role !== "vendeur" && role !== "seller" && role !== "admin") {
                alert("Le Live est réservé aux vendeurs. Deviens vendeur pour lancer un Live Shopping !");
                return;
              }
              router.push("/live/start");
            }}
            className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 text-neutral-400 hover:text-white transition"
          >
            <Radio className="w-6 h-6" />
            <span className="text-[10px] font-medium">Live</span>
          </button>

          {/* BOUTON CENTRAL TIKTOK */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="relative -top-3 flex flex-col items-center focus:outline-none"
          >
            <div className="relative w-[48px] h-[32px] flex items-center justify-center">
              <div className="absolute left-0 w-[25px] h-full bg-[#25F4EE] rounded-l-[10px]" />
              <div className="absolute right-0 w-[25px] h-full bg-[#FE2C55] rounded-r-[10px]" />
              <div className="relative z-10 w-[36px] h-[26px] bg-black rounded-[6px] flex items-center justify-center">
                <Plus className="w-5 h-5 text-white" strokeWidth={3} />
              </div>
            </div>
          </button>

          <Link href="/shop" className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 text-neutral-400 hover:text-white transition">
            <ShoppingBag className="w-6 h-6" />
            <span className="text-[10px] font-medium">Boutique</span>
          </Link>

          {/* ✅ NOTIFICATION avec badge */}
          <Link href="/notifications" className="relative flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 text-neutral-400 hover:text-white transition">
            <div className="relative">
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-[8px] text-white font-bold">{unreadCount > 9 ? "9+" : unreadCount}</span>
                </div>
              )}
            </div>
            <span className="text-[10px] font-medium">Notifications</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
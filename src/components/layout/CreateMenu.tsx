"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Video, Upload, Radio, ShoppingBag, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface CreateMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateMenu({ isOpen, onClose }: CreateMenuProps) {
  const router = useRouter();
  const supabase = createClient();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const loadRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        setRole(profile?.role || "acheteur");
      }
    };
    loadRole();
  }, [isOpen, supabase]);

  const handleAction = (path: string) => {
    onClose();
    router.push(path);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-[32px] p-6 pb-safe"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-extrabold text-moshi-text">Créer</h2>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                <X size={18} />
              </button>
            </div>

            {!role ? (
              <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 text-moshi-purple animate-spin" /></div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                
                {/* Enregistrer */}
                <button onClick={() => handleAction("/create?mode=camera")} className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-gradient-to-br from-pink-50 to-purple-50 border border-purple-100 active:scale-95 transition">
                  <div className="w-14 h-14 rounded-2xl moshi-gradient flex items-center justify-center text-white shadow-lg"><Video size={26} /></div>
                  <div className="text-center">
                    <p className="font-bold text-moshi-text text-sm">Enregistrer</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Filmer avec la caméra</p>
                  </div>
                </button>

                {/* Galerie */}
                <button onClick={() => handleAction("/create?mode=gallery")} className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 active:scale-95 transition">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white shadow-lg"><Upload size={26} /></div>
                  <div className="text-center">
                    <p className="font-bold text-moshi-text text-sm">Galerie</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Choisir une vidéo</p>
                  </div>
                </button>

                {/* OPTIONS VENDEUR UNIQUEMENT */}
                {role === "vendeur" && (
                  <>
                    <button onClick={() => handleAction("/live/start")} className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 active:scale-95 transition">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white shadow-lg"><Radio size={26} /></div>
                      <div className="text-center">
                        <p className="font-bold text-moshi-text text-sm">Live Vendeur</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Vendre en direct</p>
                      </div>
                    </button>

                    <button onClick={() => handleAction("/seller")} className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-100 active:scale-95 transition">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center text-white shadow-lg"><ShoppingBag size={26} /></div>
                      <div className="text-center">
                        <p className="font-bold text-moshi-text text-sm">Produit</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Ajouter à la boutique</p>
                      </div>
                    </button>
                  </>
                )}

                {/* OPTION ACHETEUR (Live simple) */}
                {role === "acheteur" && (
                  <button onClick={() => handleAction("/live/start?mode=simple")} className="col-span-2 flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-gradient-to-br from-red-50 to-pink-50 border border-red-100 active:scale-95 transition">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white shadow-lg"><Radio size={26} /></div>
                    <div className="text-center">
                      <p className="font-bold text-moshi-text text-sm">Lancer un Live</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Discuter avec ta communauté</p>
                    </div>
                  </button>
                )}

              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
              <button onClick={onClose} className="text-gray-500 font-medium">Annuler</button>
              <button onClick={() => handleAction("/create")} className="text-moshi-purple font-bold flex items-center gap-1">Tout voir →</button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
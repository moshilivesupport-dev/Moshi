"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Coins } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Gift {
  id: string;
  name: string;
  icon: string;
  price: number;
  category: string;
}

interface GiftPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSendGift: (gift: Gift) => void;
}

export default function GiftPanel({ isOpen, onClose, onSendGift }: GiftPanelProps) {
  const supabase = createClient();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("standard");
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!isOpen) return;
    const loadGifts = async () => {
      setLoading(true);
      const { data } = await supabase.from("gifts").select("*").order("price", { ascending: true });
      setGifts(data || []);
      setLoading(false);
    };
    loadGifts();
  }, [isOpen, supabase]);

  const filteredGifts = gifts.filter(g => g.category === selectedCategory);

  const handleSend = () => {
    if (!selectedGift) return;
    for (let i = 0; i < quantity; i++) {
      onSendGift(selectedGift);
    }
    setSelectedGift(null);
    setQuantity(1);
    onClose();
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
            className="fixed bottom-0 left-0 right-0 z-[70] bg-[#1a0b2e] rounded-t-[32px] max-h-[80dvh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/10">
              <h2 className="text-white font-bold text-lg">Envoyer un cadeau</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                <X size={18} />
              </button>
            </div>

            {/* Solde de coins */}
            <div className="px-4 py-3 flex items-center justify-between bg-white/5">
              <p className="text-white/70 text-xs">Ton solde</p>
              <div className="flex items-center gap-1.5 bg-yellow-500/20 px-3 py-1 rounded-full">
                <Coins size={14} className="text-yellow-400" />
                <span className="text-yellow-400 font-bold text-sm">1,250</span>
              </div>
            </div>

            {/* Catégories */}
            <div className="flex gap-2 px-4 py-3 border-b border-white/10">
              {[
                { id: "standard", label: "Standard" },
                { id: "premium", label: "Premium" },
                { id: "exclusif", label: "Exclusif" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-bold transition-colors",
                    selectedCategory === cat.id ? "moshi-gradient text-white" : "bg-white/10 text-white/60"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Grille de cadeaux */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {filteredGifts.map((gift) => (
                    <button
                      key={gift.id}
                      onClick={() => setSelectedGift(gift)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all",
                        selectedGift?.id === gift.id
                          ? "border-moshi-pink bg-white/10"
                          : "border-transparent bg-white/5 hover:bg-white/10"
                      )}
                    >
                      <span className="text-3xl">{gift.icon}</span>
                      <span className="text-white/80 text-[10px] font-medium truncate w-full text-center">{gift.name}</span>
                      <div className="flex items-center gap-0.5">
                        <Coins size={10} className="text-yellow-400" />
                        <span className="text-yellow-400 text-[10px] font-bold">{gift.price}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Barre d'envoi (si un cadeau est sélectionné) */}
            {selectedGift && (
              <div className="p-4 border-t border-white/10 bg-black/40">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{selectedGift.icon}</span>
                    <div>
                      <p className="text-white text-sm font-bold">{selectedGift.name}</p>
                      <p className="text-yellow-400 text-xs font-bold">{selectedGift.price} coins</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 rounded-full px-2 py-1">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-white font-bold px-2">−</button>
                    <span className="text-white font-bold w-6 text-center">{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)} className="text-white font-bold px-2">+</button>
                  </div>
                </div>
                <button
                  onClick={handleSend}
                  className="w-full moshi-gradient text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition flex items-center justify-center gap-2"
                >
                  Envoyer {quantity > 1 && `(${quantity * selectedGift.price} coins)`}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
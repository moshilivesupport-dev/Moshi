
"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Coins,
  Plus,
  Minus,
  Gift as GiftIcon,
} from "lucide-react";

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
  onSendGift: (
    gift: Gift,
    quantity?: number
  ) => void | Promise<void>;
  balance: number;
}

const CATEGORIES = [
  { id: "standard", label: "Standard" },
  { id: "premium", label: "Premium" },
  { id: "exclusif", label: "Exclusif" },
];

export default function GiftPanel({
  isOpen,
  onClose,
  onSendGift,
  balance,
}: GiftPanelProps) {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [category, setCategory] = useState("standard");
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [quantity, setQuantity] = useState(1);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function loadGifts() {
      setLoading(true);
      setLoadError("");

      const { data, error } = await supabase
        .from("gifts")
        .select("id, name, icon, price, category")
        .order("price", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error("Erreur chargement cadeaux:", error.message);
        setLoadError("Impossible de charger les cadeaux.");
      } else {
        const validGifts = (data || []).filter((gift) => {
          return (
            gift.id &&
            gift.name &&
            Number.isFinite(Number(gift.price)) &&
            Number(gift.price) >= 0
          );
        });

        setGifts(
          validGifts.map((gift) => ({
            ...gift,
            price: Number(gift.price),
          })) as Gift[]
        );
      }

      setLoading(false);
    }

    void loadGifts();

    return () => {
      cancelled = true;
    };
  }, [isOpen, supabase]);

  const filteredGifts = gifts.filter(
    (gift) => gift.category === category
  );

  const safeBalance = Number.isFinite(Number(balance))
    ? Math.max(0, Number(balance))
    : 0;

  const totalPrice = selectedGift
    ? selectedGift.price * quantity
    : 0;

  const canAfford =
    !!selectedGift &&
    Number.isFinite(totalPrice) &&
    totalPrice <= safeBalance;

  const maxQuantity = selectedGift
    ? selectedGift.price > 0
      ? Math.max(0, Math.floor(safeBalance / selectedGift.price))
      : 999
    : 1;

  const handleSend = async () => {
    if (
      !selectedGift ||
      !canAfford ||
      sending ||
      quantity < 1
    ) {
      return;
    }

    try {
      setSending(true);

      await onSendGift(selectedGift, quantity);

      setSelectedGift(null);
      setQuantity(1);
      onClose();
    } catch (error) {
      console.error("Erreur envoi cadeau:", error);
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (sending) return;
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
            onClick={handleClose}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 28,
              stiffness: 230,
            }}
            className="fixed bottom-0 left-0 right-0 z-[70] flex max-h-[82dvh] flex-col overflow-hidden rounded-t-[30px] border border-white/10 bg-[#160D25] pb-safe"
          >
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="text-lg font-extrabold text-white">
                  Cadeaux Moshi
                </h2>
                <p className="text-xs text-white/45">
                  Fais plaisir à ton créateur préféré
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={sending}
                aria-label="Fermer"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-40"
              >
                <X size={19} />
              </button>
            </div>

            {/* WALLET */}
            <div className="flex items-center justify-between bg-white/[0.04] px-5 py-3">
              <span className="text-sm text-white/60">
                Ton portefeuille
              </span>

              <div className="flex items-center gap-2 rounded-full bg-yellow-400/10 px-3 py-1.5">
                <Coins size={15} className="text-yellow-400" />

                <span className="font-bold text-yellow-400">
                  {safeBalance.toLocaleString("fr-FR")} coins
                </span>
              </div>
            </div>

            {/* CATEGORIES */}
            <div className="flex gap-2 overflow-x-auto border-b border-white/10 px-4 py-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.id);
                    setSelectedGift(null);
                    setQuantity(1);
                  }}
                  className={cn(
                    "shrink-0 rounded-full px-5 py-2 text-xs font-bold transition",
                    category === cat.id
                      ? "moshi-gradient text-white shadow-lg"
                      : "bg-white/10 text-white/60"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* GIFTS */}
            <div className="min-h-[180px] flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              ) : loadError ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-red-400">
                    {loadError}
                  </p>
                </div>
              ) : filteredGifts.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <GiftIcon
                    size={35}
                    className="mb-3 text-white/30"
                  />
                  <p className="text-sm text-white/60">
                    Aucun cadeau dans cette catégorie.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {filteredGifts.map((gift) => (
                    <button
                      key={gift.id}
                      type="button"
                      disabled={sending}
                      onClick={() => {
                        setSelectedGift(gift);
                        setQuantity(1);
                      }}
                      className={cn(
                        "flex min-w-0 flex-col items-center gap-1 rounded-2xl border p-2 transition disabled:opacity-50",
                        selectedGift?.id === gift.id
                          ? "border-pink-400 bg-pink-500/15"
                          : "border-white/5 bg-white/[0.04]"
                      )}
                    >
                      <span className="text-3xl">
                        {gift.icon}
                      </span>

                      <span className="w-full truncate text-center text-[10px] font-semibold text-white/90">
                        {gift.name}
                      </span>

                      <span className="text-[10px] font-bold text-yellow-400">
                        {gift.price.toLocaleString("fr-FR")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* SELECTED GIFT */}
            {selectedGift && (
              <div className="border-t border-white/10 bg-[#10091B] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">
                      {selectedGift.icon}
                    </span>

                    <div>
                      <p className="font-bold text-white">
                        {selectedGift.name}
                      </p>

                      <p className="text-xs text-yellow-400">
                        {selectedGift.price.toLocaleString("fr-FR")} coins / unité
                      </p>
                    </div>
                  </div>

                  {/* QUANTITY */}
                  <div className="flex items-center gap-3 rounded-full bg-white/10 px-2 py-1">
                    <button
                      type="button"
                      disabled={sending || quantity <= 1}
                      onClick={() =>
                        setQuantity((q) => Math.max(1, q - 1))
                      }
                      className="text-white disabled:opacity-30"
                      aria-label="Diminuer la quantité"
                    >
                      <Minus size={16} />
                    </button>

                    <span className="w-5 text-center font-bold text-white">
                      {quantity}
                    </span>

                    <button
                      type="button"
                      disabled={sending || quantity >= maxQuantity}
                      onClick={() =>
                        setQuantity((q) =>
                          Math.min(maxQuantity, q + 1)
                        )
                      }
                      className="text-white disabled:opacity-30"
                      aria-label="Augmenter la quantité"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {!canAfford && (
                  <p className="mb-2 text-xs text-red-400">
                    Solde insuffisant pour ce cadeau.
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!canAfford || sending}
                  className="moshi-gradient flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-extrabold text-white shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sending ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      Envoyer · {totalPrice.toLocaleString("fr-FR")} coins
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

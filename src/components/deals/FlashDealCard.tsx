"use client";

import { useEffect, useState } from "react";
import { formatCurrency, CurrencyCode } from "@/lib/currency";
import { Button } from "@/components/ui/Button";
import { Zap, Clock } from "lucide-react";

interface FlashDeal {
  id: string;
  product_title: string;
  product_image?: string;
  original_price: number;
  deal_price: number;
  currency: string;
  stock_limit?: number;
  sold_count: number;
  ends_at: string;
}

export function FlashDealCard({ deal, onBuy }: { deal: FlashDeal; onBuy?: () => void }) {
  const [timeLeft, setTimeLeft] = useState("");
  const remaining = (deal.stock_limit || 999) - deal.sold_count;

  useEffect(() => {
    const tick = () => {
      const diff = new Date(deal.ends_at).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Terminé");
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deal.ends_at]);

  const discount = Math.round(((deal.original_price - deal.deal_price) / deal.original_price) * 100);

  return (
    <div className="card border-coral/30 bg-gradient-to-br from-coral/10 to-transparent p-3">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-4 h-4 text-coral" />
        <span className="text-xs font-bold text-coral">FLASH DEAL -{discount}%</span>
        <span className="ml-auto flex items-center gap-1 text-xs text-muted">
          <Clock className="w-3 h-3" /> {timeLeft}
        </span>
      </div>
      <div className="flex gap-3">
        {deal.product_image && (
          <img src={deal.product_image} alt="" className="w-16 h-16 rounded-lg object-cover" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{deal.product_title}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-champagne font-bold">
              {formatCurrency(deal.deal_price, deal.currency as CurrencyCode)}
            </span>
            <span className="text-xs text-muted line-through">
              {formatCurrency(deal.original_price, deal.currency as CurrencyCode)}
            </span>
          </div>
          <p className="text-[10px] text-muted mt-0.5">{remaining} restants</p>
        </div>
      </div>
      <Button size="sm" className="w-full mt-3" onClick={onBuy}>
        Acheter maintenant
      </Button>
    </div>
  );
}

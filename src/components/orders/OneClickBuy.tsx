"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatCurrency, CurrencyCode } from "@/lib/currency";
import { ShoppingBag } from "lucide-react";

interface Props {
  productId: string;
  title: string;
  price: number;
  currency: string;
  streamId?: string;
  disabled?: boolean;
  onSuccess?: () => void;
}

export function OneClickBuy({ productId, title, price, currency, streamId, disabled, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buy = async () => {
    setLoading(true);
    setError(null);
    try {
      // Le prix n'est PAS envoyé : le serveur le relit en base.
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1, streamId }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        window.location.href = "/auth/login";
        return;
      }
      if (!res.ok || !data.paymentUrl) {
        throw new Error(data.error || "Impossible de lancer le paiement");
      }

      onSuccess?.();
      window.location.href = data.paymentUrl; // guichet CinetPay
    } catch (e: any) {
      setError(e.message || "Erreur lors du paiement");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button className="w-full" variant="gold" loading={loading} disabled={disabled} onClick={buy} aria-label={`Acheter ${title}`}>
        <ShoppingBag className="w-4 h-4 mr-2" />
        Acheter · {formatCurrency(price, currency as CurrencyCode)}
      </Button>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
    </div>
  );
}

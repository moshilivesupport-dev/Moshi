"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { formatCurrency, CurrencyCode } from "@/lib/currency";
import { Check, X, Banknote } from "lucide-react";

interface Payout {
  id: string;
  seller_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  seller?: { username: string; full_name?: string };
}

export function PayoutManagement({ initialPayouts }: { initialPayouts: Payout[] }) {
  const [payouts, setPayouts] = useState(initialPayouts);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const supabase = createClient();

  const updateStatus = async (id: string, status: "processing" | "paid" | "rejected", note?: string) => {
    setLoadingId(id);
    try {
      await supabase
        .from("withdrawals")
        .update({
          status,
          admin_note: note || null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", id);
      setPayouts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    } finally {
      setLoadingId(null);
    }
  };

  if (payouts.length === 0) {
    return (
      <div className="card text-center py-12 text-muted text-sm">
        <Banknote className="w-10 h-10 mx-auto mb-2 opacity-50" />
        Aucune demande de retrait en attente
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {payouts.map((p) => (
        <div key={p.id} className="card flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">
              {p.seller?.full_name || p.seller?.username || "Vendeur"}
            </p>
            <p className="text-xs text-muted">@{p.seller?.username}</p>
            <p className="text-champagne font-bold mt-1">
              {formatCurrency(p.amount, p.currency as CurrencyCode)}
            </p>
            <p className="text-[10px] text-muted">{new Date(p.created_at).toLocaleString("fr")}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full capitalize ${
            p.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
            p.status === "processing" ? "bg-blue-500/20 text-blue-400" :
            p.status === "paid" ? "bg-green-500/20 text-green-400" :
            "bg-red-500/20 text-red-400"
          }`}>
            {p.status}
          </span>
          {p.status === "pending" && (
            <div className="flex gap-2">
              <Button size="sm" variant="primary" loading={loadingId === p.id} onClick={() => updateStatus(p.id, "processing")}>
                Traiter
              </Button>
              <Button size="sm" variant="gold" loading={loadingId === p.id} onClick={() => updateStatus(p.id, "paid")}>
                <Check className="w-3.5 h-3.5 mr-1" /> Payé
              </Button>
              <Button size="sm" variant="danger" loading={loadingId === p.id} onClick={() => updateStatus(p.id, "rejected")}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
          {p.status === "processing" && (
            <Button size="sm" variant="gold" loading={loadingId === p.id} onClick={() => updateStatus(p.id, "paid")}>
              Marquer payé
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

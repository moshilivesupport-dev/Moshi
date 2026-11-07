"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Check, X, Shield } from "lucide-react";

interface Seller {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  country: string | null;
  age: number | null;
  gender: string | null;
  seller_status: string;
  created_at: string;
}

interface Props {
  initialSellers: Seller[];
}

export function SellerQueue({ initialSellers }: Props) {
  const [sellers, setSellers] = useState(initialSellers);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const supabase = createClient();

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    setLoadingId(id);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          seller_status: status,
          is_verified: status === "approved",
          role: status === "approved" ? "seller" : "buyer",
        })
        .eq("id", id);
      if (error) throw error;
      setSellers((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setLoadingId(null);
    }
  };

  if (sellers.length === 0) {
    return (
      <div className="card text-center py-12">
        <Shield className="w-12 h-12 text-muted mx-auto mb-3" />
        <p className="text-muted">Aucune demande vendeur en attente</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sellers.map((s) => (
        <div key={s.id} className="card flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-onyx flex-shrink-0 border-2 border-coral/30">
            {s.avatar_url ? (
              <img src={s.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl text-muted">?</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white">{s.full_name || s.username}</p>
            <p className="text-sm text-muted">@{s.username}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted">
              <span>Pays : <strong className="text-white">{s.country || "—"}</strong></span>
              <span>Âge : <strong className="text-white">{s.age || "—"}</strong></span>
              <span>Genre : <strong className="text-white">{s.gender || "—"}</strong></span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="primary"
              loading={loadingId === s.id}
              onClick={() => updateStatus(s.id, "approved")}
            >
              <Check className="w-4 h-4 mr-1" /> Approuver
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={loadingId === s.id}
              onClick={() => updateStatus(s.id, "rejected")}
            >
              <X className="w-4 h-4 mr-1" /> Rejeter
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

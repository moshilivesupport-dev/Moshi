"use client";

import { Button } from "@/components/ui/Button";
import { Gift } from "lucide-react";

export function CommunityGift({ onDistribute }: { onDistribute?: () => void }) {
  return (
    <div className="card border-champagne/20 bg-gradient-to-r from-champagne/5 to-transparent">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-champagne/20 flex items-center justify-center">
          <Gift className="w-5 h-5 text-champagne" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">Offrir à la communauté</p>
          <p className="text-xs text-muted">Distribuez des gifts à vos viewers</p>
        </div>
        <Button size="sm" variant="gold" onClick={onDistribute}>
          Distribuer
        </Button>
      </div>
    </div>
  );
}

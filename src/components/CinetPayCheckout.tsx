"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatCurrency, CurrencyCode } from "@/lib/currency";
import { buildCheckoutBreakdown } from "@/lib/payment/cinetpay";
import { MobileMoneyCheckout } from "./MobileMoneyCheckout";

interface Props {
  productPrice: number;
  currency?: string;
  productTitle?: string;
  onSuccess?: () => void;
}

export function CinetPayCheckout({
  productPrice,
  currency = "XOF",
  productTitle = "Produit",
  onSuccess,
}: Props) {
  const [step, setStep] = useState<"summary" | "pay">("summary");
  const breakdown = useMemo(
    () => buildCheckoutBreakdown(productPrice, currency),
    [productPrice, currency]
  );

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold text-white">Paiement sécurisé (CinetPay)</h3>
      <p className="text-xs text-muted">{productTitle}</p>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Prix produit</span>
          <span className="text-white">{formatCurrency(breakdown.productPrice, currency as CurrencyCode)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Frais CinetPay (Mobile Money / Carte)</span>
          <span className="text-white">+ {formatCurrency(breakdown.cinetpayFees, currency as CurrencyCode)}</span>
        </div>
        <div className="border-t border-white/10 pt-2 flex justify-between font-semibold">
          <span className="text-white">Total à payer</span>
          <span className="text-champagne">{formatCurrency(breakdown.customerTotal, currency as CurrencyCode)}</span>
        </div>
        <p className="text-[10px] text-muted mt-1">
          Le vendeur reçoit le prix produit. La commission plateforme est prélevée sur les payouts vendeur.
        </p>
      </div>

      {step === "summary" ? (
        <Button className="w-full" variant="gold" onClick={() => setStep("pay")}>
          Continuer vers le paiement
        </Button>
      ) : (
        <MobileMoneyCheckout
          amount={breakdown.customerTotal}
          currency={currency}
          onSuccess={onSuccess}
        />
      )}
    </div>
  );
}

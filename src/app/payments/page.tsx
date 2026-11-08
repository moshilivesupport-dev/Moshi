"use client";

import { MobileMoneyCheckout } from "@/components/payment/MobileMoneyCheckout";
import { useState } from "react";

export default function PaymentsDemoPage() {
  const [success, setSuccess] = useState(false);

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-2">Paiement Mobile Money</h1>
      <p className="text-muted text-sm mb-8">Wave · Orange Money · Moov · MTN MoMo · Free Money</p>

      {success ? (
        <div className="card text-center py-10 text-green-400">
          Paiement confirmé ✓
        </div>
      ) : (
        <MobileMoneyCheckout
          amount={5000}
          currency="XOF"
          onSuccess={() => setSuccess(true)}
        />
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatCurrency, CurrencyCode } from "@/lib/currency";

const PROVIDERS = [
  { id: "wave", name: "Wave", color: "bg-blue-500" },
  { id: "orange_money", name: "Orange Money", color: "bg-orange-500" },
  { id: "moov", name: "Moov Money", color: "bg-blue-700" },
  { id: "mtn_momo", name: "MTN MoMo", color: "bg-yellow-500 text-black" },
  { id: "free_money", name: "Free Money", color: "bg-red-600" },
];

interface Props {
  amount: number;
  currency?: string;
  onSuccess?: (provider: string) => void;
}

export function MobileMoneyCheckout({ amount, currency = "XOF", onSuccess }: Props) {
  const [provider, setProvider] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"select" | "phone" | "confirm">("select");

  const pay = async () => {
    if (!provider || !phone) return;
    setLoading(true);
    // Stub: integrate real Wave / Orange / Moov / MTN APIs here
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    onSuccess?.(provider);
    setStep("confirm");
  };

  if (step === "confirm") {
    return (
      <div className="card text-center py-8">
        <p className="text-green-400 font-semibold mb-2">Paiement initié</p>
        <p className="text-sm text-muted">
          Validez sur votre téléphone ({phone}) via {PROVIDERS.find(p => p.id === provider)?.name}.
        </p>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <p className="text-sm text-muted">
        Montant : <span className="text-champagne font-bold">{formatCurrency(amount, currency as CurrencyCode)}</span>
      </p>

      {step === "select" && (
        <div className="grid grid-cols-2 gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => { setProvider(p.id); setStep("phone"); }}
              className={`py-3 px-2 rounded-xl text-sm font-medium text-white ${p.color} hover:opacity-90 transition`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {step === "phone" && (
        <>
          <input
            type="tel"
            placeholder="Numéro (ex: 90 00 00 00)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-field"
          />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep("select")}>Retour</Button>
            <Button className="flex-1" loading={loading} onClick={pay} disabled={phone.length < 8}>
              Payer avec {PROVIDERS.find(p => p.id === provider)?.name}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

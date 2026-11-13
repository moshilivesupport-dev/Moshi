"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, History } from "lucide-react";

export default function TransactionsPage() {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      <header className="sticky top-0 z-30 bg-black flex items-center gap-2 px-2 py-3 border-b border-neutral-800">
        <button onClick={() => router.back()} className="p-2">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-semibold">Transactions</h1>
      </header>

      <div className="flex flex-col items-center justify-center py-20 gap-3 px-6 text-center">
        <History className="w-12 h-12 text-neutral-700" />
        <p className="text-neutral-400 text-sm">
          Aucune transaction pour le moment.
        </p>
        <p className="text-neutral-600 text-xs">
          Tes achats et envois de cadeaux apparaîtront ici.
        </p>
      </div>
    </div>
  );
}
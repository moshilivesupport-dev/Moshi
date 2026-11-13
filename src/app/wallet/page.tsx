"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Settings, Eye, EyeOff, ChevronRight,
  Gift, TrendingUp, Award, Star, Briefcase, ShieldCheck
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { formatNumber } from "@/lib/utils";

export default function WalletPage() {
  const router = useRouter();
  const { wallet, loading } = useWallet();
  const [showBalance, setShowBalance] = useState(true);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={() => router.back()} className="p-2">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-base font-semibold">Solde</h1>
        <Link href="/settings" className="p-2">
          <Settings className="w-6 h-6" />
        </Link>
      </header>

      {/* Carte Solde principal */}
      <div className="px-4 mt-6 mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <p className="text-sm text-neutral-400">Solde estimé USD</p>
          <button onClick={() => setShowBalance(!showBalance)} className="p-1">
            {showBalance ? <Eye className="w-4 h-4 text-neutral-400" /> : <EyeOff className="w-4 h-4 text-neutral-400" />}
          </button>
        </div>
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-5xl font-light tracking-tight">
            {showBalance
              ? (wallet?.usd_balance || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
              : "••••"}
          </h2>
          <ChevronRight className="w-6 h-6 text-neutral-400" />
        </div>
      </div>

      {/* Carte Pièces */}
      <div className="px-4 mb-4">
        <Link
          href="/coins"
          className="block bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-2xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-black text-xs font-bold">
                ¢
              </div>
              <p className="text-sm text-neutral-300">Pièces</p>
            </div>
            <div className="flex items-center gap-1 text-pink-500 font-semibold text-sm">
              <Gift className="w-4 h-4" />
              Obtenir des Pièces
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2">
            {loading ? "…" : formatNumber(wallet?.coins_balance || 0)}
          </p>
        </Link>
      </div>

      {/* Transactions */}
      <div className="px-4 mb-3">
        <Link
          href="/wallet/transactions"
          className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-2xl p-4"
        >
          <span className="text-sm font-medium">Transactions</span>
          <div className="flex items-center gap-1 text-neutral-400">
            <span className="text-sm">Tout voir</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </Link>
      </div>

      {/* Offre de première recharge */}
      <div className="px-4 mb-4">
        <button className="w-full flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-left">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <p className="text-base font-semibold">Offre de première recharge</p>
              <ChevronRight className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm text-neutral-400 leading-tight">
              Obtiens des Cadeaux et des Pièces bonus
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center flex-shrink-0">
            <Gift className="w-7 h-7 text-white" />
          </div>
        </button>
      </div>

      {/* Grille d'outils */}
      <div className="px-4 mb-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
          <div className="grid grid-cols-3 gap-4">
            <button className="flex flex-col items-start gap-2">
              <div className="w-11 h-11 rounded-lg bg-neutral-800 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-white text-left">Récompenses LIVE</span>
            </button>

            <button className="flex flex-col items-start gap-2">
              <div className="w-11 h-11 rounded-lg bg-neutral-800 flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-white text-left">Monétisation</span>
            </button>

            <button className="flex flex-col items-start gap-2">
              <div className="w-11 h-11 rounded-lg bg-neutral-800 flex items-center justify-center">
                <Star className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-white text-left">Campagnes</span>
            </button>

            <button className="flex flex-col items-start gap-2">
              <div className="w-11 h-11 rounded-lg bg-neutral-800 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-white text-left">Gestionnaire d'abonnement</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Sécurité */}
      <div className="px-4 pb-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-1 text-neutral-500 text-xs">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Sécurisé par Moshi</span>
        </div>
        <p className="text-[10px] text-neutral-600 text-center leading-tight max-w-xs">
          Solde n'est pas un produit financier. Les informations présentées le sont à titre indicatif uniquement.
        </p>
      </div>
    </div>
  );
}
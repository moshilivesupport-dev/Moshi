"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { locales, localeNames, type Locale } from "@/lib/i18n/config";
import { useState } from "react";

export default function LanguageSettingsPage() {
  const [current, setCurrent] = useState<Locale>("fr");

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link href="/settings" className="inline-flex items-center gap-1 text-sm text-muted hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> Paramètres
      </Link>
      <h1 className="text-xl font-bold text-white mb-6">Langue</h1>
      <div className="card p-0 divide-y divide-white/5">
        {locales.map((l) => (
          <button
            key={l}
            onClick={() => setCurrent(l)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/5 text-left"
          >
            <span className="text-sm text-white">{localeNames[l]}</span>
            {current === l && <span className="text-coral text-xs font-bold">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

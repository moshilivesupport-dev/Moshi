"use client";

import { locales, localeNames, type Locale } from "@/lib/i18n/config";

export function LanguageSwitcher({ current = "fr" }: { current?: Locale }) {
  return (
    <select
      defaultValue={current}
      className="bg-anthracite border border-white/10 text-sm text-white rounded-lg px-2 py-1.5 focus:outline-none focus:border-coral"
      onChange={(e) => {
        // In production with next-intl: use router + locale prefix
        console.log("Switch to", e.target.value);
      }}
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {localeNames[l]}
        </option>
      ))}
    </select>
  );
}

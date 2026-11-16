import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(".0", "") + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(".0", "") + "K";
  }
  return num.toString();
}

// NOUVEAU : Helper pour les drapeaux
export function getFlag(countryCode: string | null | undefined): string {
  if (!countryCode) return "🌍";
  const flags: Record<string, string> = {
    TG: "🇹🇬", BJ: "🇧🇯", CI: "🇨🇮", SN: "🇸🇳", BF: "🇧🇫",
    ML: "🇲🇱", NE: "🇳🇪", GH: "🇬🇭", NG: "🇳🇬", CM: "🇨🇲",
    GA: "🇬🇦", CD: "🇨🇩", CG: "🇨🇬", TD: "🇹🇩", CF: "🇨🇫",
    MA: "🇲🇦", DZ: "🇩🇿", TN: "🇹🇳", EG: "🇪🇬",
    FR: "🇫🇷", BE: "🇧🇪", CH: "🇨🇭", CA: "🇨🇦",
    US: "🇺🇸", GB: "🇬🇧", DE: "🇩🇪", IT: "🇮🇹",
    ES: "🇪🇸", PT: "🇵🇹", BR: "🇧🇷", CN: "🇨🇳",
    JP: "🇯🇵", IN: "🇮🇳", AE: "🇦🇪", SA: "🇸🇦", ZA: "🇿🇦",
  };
  return flags[countryCode.toUpperCase()] || "🌍";
}
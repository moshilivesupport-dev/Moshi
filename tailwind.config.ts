import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        onyx: "#0c0c0e",
        anthracite: "#16161a",
        coral: "#ff4d4d",
        "warm-red": "#e63946",
        champagne: "#d4af37",
        gold: "#c9a227",
        muted: "#a1a1aa",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gold-shine": "linear-gradient(135deg, #d4af37 0%, #f5e6a3 50%, #c9a227 100%)",
      },
      animation: {
        "gift-float": "giftFloat 2.5s ease-out forwards",
        "pulse-gold": "pulseGold 2s infinite",
      },
      keyframes: {
        giftFloat: {
          "0%": { transform: "translateY(0) scale(0.5)", opacity: "0" },
          "20%": { opacity: "1", transform: "translateY(-20px) scale(1.1)" },
          "100%": { transform: "translateY(-120px) scale(1)", opacity: "0" },
        },
        pulseGold: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(212, 175, 55, 0.4)" },
          "50%": { boxShadow: "0 0 0 12px rgba(212, 175, 55, 0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;

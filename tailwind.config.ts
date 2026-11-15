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
        moshi: {
          pink: "#FF8FB1",
          purple: "#9D7BEA",
          blue: "#60A5FA",
          bg: "#F9FAFB",
          dark: "#111111",
          text: "#1F2937",
        },
      },
      fontFamily: {
        sans: ["Poppins", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
      backgroundImage: {
        "moshi-gradient":
          "linear-gradient(110deg, #FF8FB1, #9D7BEA 55%, #60A5FA)",
      },
      keyframes: {
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "spin-slow": "spin-slow 5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
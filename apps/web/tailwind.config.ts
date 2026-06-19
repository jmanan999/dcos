import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Delhi government palette
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#1a4fa3",
          600: "#1e40af",
          700: "#1d3a8a",
          900: "#1e3a5f",
        },
        saffron: {
          400: "#fb923c",
          500: "#f97316",
          600: "#ea6c0a",
        },
        severity: {
          critical: "#dc2626",
          high: "#ea580c",
          medium: "#ca8a04",
          low: "#16a34a",
        },
      },
      fontFamily: {
        sans: ["Inter var", "Inter", "system-ui", "sans-serif"],
        devanagari: ["Noto Sans Devanagari", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

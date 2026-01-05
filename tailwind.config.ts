import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      container: { center: true, padding: "1rem", screens: { "2xl": "1400px" } },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.12)"
      }
    },
  },
  plugins: [],
} satisfies Config;

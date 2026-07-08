import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // Paleta CRM Automotor (azul oscuro / gris / estados)
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e3a8a",
          900: "#172554",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Estados semánticos
        ok: "#16a34a", // verde - disponible / vigente
        danger: "#dc2626", // rojo - vencido / perdido
        warn: "#d97706", // amarillo/ámbar - pendiente / por vencer
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Nombrados "elevate*" (no "card"/"pop-over") a propósito: Tailwind
        // autogenera utilidades shadow-{color} para cada color del theme, y
        // un boxShadow custom con el mismo nombre que un color (ej. "card")
        // queda pisado en silencio por esa utilidad de color.
        elevate: "0 1px 2px 0 rgba(16,24,40,0.04), 0 2px 8px -2px rgba(16,24,40,0.06)",
        "elevate-hover": "0 4px 16px -4px rgba(16,24,40,0.12), 0 2px 4px -2px rgba(16,24,40,0.06)",
        pop: "0 8px 24px -6px rgba(16,24,40,0.16)",
      },
    },
  },
  plugins: [],
};

export default config;

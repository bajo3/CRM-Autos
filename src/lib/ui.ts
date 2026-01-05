import { cn } from "@/lib/utils";

/**
 * UI helpers (light theme)
 * - Usalos como className={ui.card()} o ui.button("primary"), etc.
 */
export const ui = {
  // Contenedores / tarjetas
  card: (className?: string) =>
    cn("rounded-2xl border border-slate-200 bg-white", className),

  cardHeader: (className?: string) =>
    cn("border-b border-slate-200 bg-slate-50", className),

  // Inputs
  input: (className?: string) =>
    cn(
      "w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none",
      "focus:border-slate-500",
      className
    ),

  select: (className?: string) =>
    cn(
      "w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none",
      "focus:border-slate-500",
      className
    ),

  textarea: (className?: string) =>
    cn(
      "w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none",
      "focus:border-slate-500",
      className
    ),

  // Botones
  button: (
    variant: "primary" | "secondary" | "ghost" | "danger" = "secondary",
    className?: string
  ) =>
    cn(
      "inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm transition disabled:opacity-60",
      variant === "primary" &&
        "border-slate-300 bg-slate-900 text-white hover:bg-slate-800",
      variant === "secondary" &&
        "border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
      variant === "ghost" && "border-transparent bg-transparent text-slate-900 hover:bg-slate-50",
      variant === "danger" &&
        "border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100",
      className
    ),

  // Chips (para filtros tipo Mis leads / Vencidos)
  chip: (active: boolean, tone: "indigo" | "rose" | "neutral" = "neutral", className?: string) =>
    cn(
      "rounded-2xl border px-3 py-2 text-sm transition",
      !active && "border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
      active && tone === "indigo" && "border-indigo-300 bg-indigo-50 text-indigo-900",
      active && tone === "rose" && "border-rose-300 bg-rose-50 text-rose-900",
      active && tone === "neutral" && "border-slate-300 bg-slate-50 text-slate-900",
      className
    ),
};

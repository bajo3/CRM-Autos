import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "ok" | "warn" | "danger" | "info";

const TONES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  ok: "bg-green-100 text-green-800",
  warn: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
};

/** Mapea estados del dominio a un tono semántico. */
export function toneForEstado(estado: string | null | undefined): Tone {
  if (!estado) return "neutral";
  const ok = ["disponible", "vigente", "activa", "activo", "completo", "realizado", "entregado", "pagada", "vendido", "resuelto"];
  const warn = ["por_vencer", "por_terminar", "pendiente", "en_preparacion", "en_negociacion", "reservado", "interesado", "contactado", "incompleto", "agendado", "buscando", "en_taller", "en_revision"];
  const danger = ["vencida", "vencido", "perdido", "caida", "rechazado", "cancelada", "cancelado", "observado", "no_asistio"];
  if (ok.includes(estado)) return "ok";
  if (danger.includes(estado)) return "danger";
  if (warn.includes(estado)) return "warn";
  return "info";
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

import type { Database } from "@/lib/types/database.types";

export type FormaPago = Database["public"]["Enums"]["forma_pago"];
export type EstadoPresupuesto = Database["public"]["Enums"]["estado_presupuesto"];

export const FORMAS_PAGO: { value: FormaPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "credito", label: "Crédito / financiación" },
  { value: "mixto", label: "Mixto" },
  { value: "permuta", label: "Permuta" },
];

export const ESTADOS: { value: EstadoPresupuesto; label: string }[] = [
  { value: "borrador", label: "Borrador" },
  { value: "enviado", label: "Enviado" },
  { value: "aceptado", label: "Aceptado" },
  { value: "rechazado", label: "Rechazado" },
  { value: "vencido", label: "Vencido" },
];

export const ESTADO_VALUES = ESTADOS.map((e) => e.value);

export const ESTADO_LABEL: Record<EstadoPresupuesto, string> = Object.fromEntries(
  ESTADOS.map((e) => [e.value, e.label]),
) as Record<EstadoPresupuesto, string>;

type Tone = "neutral" | "ok" | "warn" | "danger" | "info";
export const ESTADO_TONE: Record<EstadoPresupuesto, Tone> = {
  borrador: "neutral",
  enviado: "info",
  aceptado: "ok",
  rechazado: "danger",
  vencido: "warn",
};

/** Saldo a financiar = precio - anticipo - bonificación (nunca negativo). */
export function calcularSaldo(
  precio: number | null,
  anticipo: number | null,
  bonificacion: number | null,
): number {
  return Math.max(0, (precio ?? 0) - (anticipo ?? 0) - (bonificacion ?? 0));
}

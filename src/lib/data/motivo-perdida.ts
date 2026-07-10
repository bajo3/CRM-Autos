export const MOTIVOS_PERDIDA = [
  ["precio", "Precio / presupuesto"],
  ["financiacion", "No consiguió financiación"],
  ["sin_stock", "No había una unidad adecuada"],
  ["compro_otro", "Compró en otra agencia"],
  ["sin_respuesta", "Dejó de responder"],
  ["postergado", "Postergó la compra"],
  ["otro", "Otro motivo"],
] as const;

export type MotivoPerdida = typeof MOTIVOS_PERDIDA[number][0];
const TAG = /\n?\[MOTIVO_PERDIDA:([a-z_]+)\]/g;

export function motivoPerdidaDe(observaciones?: string | null): MotivoPerdida | null {
  const coincidencia = [...(observaciones ?? "").matchAll(TAG)].at(-1)?.[1];
  return MOTIVOS_PERDIDA.some(([codigo]) => codigo === coincidencia) ? coincidencia as MotivoPerdida : null;
}

export function guardarMotivoPerdida(observaciones: string | undefined, motivo?: MotivoPerdida) {
  const texto = observacionesSinMotivo(observaciones);
  return motivo ? `${texto}${texto ? "\n" : ""}[MOTIVO_PERDIDA:${motivo}]` : texto || undefined;
}

export function observacionesSinMotivo(observaciones?: string | null) {
  return (observaciones ?? "").replace(TAG, "").trim();
}

export function etiquetaMotivoPerdida(motivo: string) {
  return MOTIVOS_PERDIDA.find(([codigo]) => codigo === motivo)?.[1] ?? "Sin especificar";
}

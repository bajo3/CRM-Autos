/** Helpers de formato para Argentina (ARS, fechas es-AR). */

export function formatARS(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-AR").format(value);
}

/**
 * Parsea un string de fecha respetando si es "fecha pura" (columna `date`,
 * ej. "2026-07-06") o timestamp (`timestamptz`, ej. "2026-07-04T13:31:08+00").
 * Las fechas puras se parsean a medianoche LOCAL (agregando "T00:00:00"): sin esto,
 * `new Date("2026-07-06")` se interpreta como medianoche UTC y en husos horarios
 * negativos (Argentina, UTC-3) se muestra un día antes del real.
 */
export function parseDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? parseDate(value) : value;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function daysUntil(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const d = typeof value === "string" ? parseDate(value) : value;
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

/** Convierte enum snake_case a etiqueta legible: "en_preparacion" -> "En preparación". */
const LABEL_OVERRIDES: Record<string, string> = {
  en_preparacion: "En preparación",
  no_publicado: "No publicado",
  en_negociacion: "En negociación",
  pidio_financiacion: "Pidió financiación",
  agendo_visita: "Agendó visita",
  visito_agencia: "Visitó agencia",
  unidad_encontrada: "Unidad encontrada",
  por_vencer: "Por vencer",
  por_terminar: "Por terminar",
  no_asistio: "No asistió",
  en_revision: "En revisión",
  en_taller: "En taller",
  listo_publicar: "Listo p/ publicar",
  listo_entregar: "Listo p/ entregar",
  solo_lectura: "Solo lectura",
  dueno: "Dueño / Admin",
};

export function humanize(value: string | null | undefined): string {
  if (!value) return "—";
  if (LABEL_OVERRIDES[value]) return LABEL_OVERRIDES[value];
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}

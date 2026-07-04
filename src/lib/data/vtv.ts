/**
 * Cálculo de VTV por patente.
 *
 * El mes de vencimiento depende del último dígito de la patente y del
 * calendario de la jurisdicción (configurable por empresa en
 * `empresa.vtv_calendario`, un mapa dígito→mes). El día se fija al último
 * del mes. Ver Etapa 7 en /docs/ETAPAS_DESARROLLO.md.
 */

import { parseDate } from "@/lib/format";

export type VtvCalendario = Record<string, number>;

const DEFAULT_CALENDARIO: VtvCalendario = {
  "2": 2, "3": 3, "4": 4, "5": 5, "6": 6,
  "7": 7, "8": 8, "9": 9, "0": 10, "1": 11,
};

export type VtvEstado = "vigente" | "por_vencer" | "vencida" | "pendiente";

export type VtvCalculo = {
  ultimo_digito: string | null;
  mes_sugerido: number | null;
  fecha_vencimiento: string | null;
  estado: VtvEstado;
};

/** Último día del mes `mes` (1–12) del año `anio`, en ISO (yyyy-mm-dd). */
function ultimoDiaDelMes(anio: number, mes: number): string {
  const d = new Date(anio, mes, 0); // día 0 del mes siguiente = último del mes
  const mm = String(mes).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${anio}-${mm}-${dd}`;
}

/**
 * Estado derivado del vencimiento (ventana de 60 días).
 * Parsea la fecha igual que `daysUntil` (src/lib/format.ts) para que ambas
 * coincidan en los días límite — antes usaban convenciones distintas
 * (una con hora local explícita, otra vía `new Date(string)` a secas) y
 * podían discrepar en un día según el huso horario del servidor.
 */
export function estadoPorVencimiento(fechaISO: string | null | undefined): VtvEstado {
  if (!fechaISO) return "pendiente";
  const venc = parseDate(fechaISO);
  if (isNaN(venc.getTime())) return "pendiente";
  venc.setHours(0, 0, 0, 0);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = new Date(hoy.getTime() + 60 * 86_400_000);
  if (venc < hoy) return "vencida";
  if (venc <= limite) return "por_vencer";
  return "vigente";
}

/**
 * Calcula los datos de VTV de un vehículo.
 *
 * @param patente      Patente del vehículo (se usa el último carácter numérico).
 * @param calendario   `empresa.vtv_calendario` (o el default de PBA).
 * @param fechaManual  Vencimiento cargado a mano; si viene, manda sobre el cálculo.
 * @param desde        Fecha base para proyectar el próximo vencimiento (default hoy).
 */
export function calcularVtv(
  patente: string | null | undefined,
  calendario: VtvCalendario | null | undefined,
  fechaManual?: string | null,
  desde: Date = new Date(),
): VtvCalculo {
  const cal = calendario && Object.keys(calendario).length > 0 ? calendario : DEFAULT_CALENDARIO;

  const digitos = (patente ?? "").replace(/\D/g, "");
  const ultimo = digitos.length > 0 ? digitos.slice(-1) : null;
  const mes = ultimo != null ? cal[ultimo] ?? null : null;

  let fecha_vencimiento = fechaManual && fechaManual.length > 0 ? fechaManual : null;

  if (!fecha_vencimiento && mes != null) {
    // Próxima ocurrencia del mes sugerido: este año si todavía no pasó, si no el próximo.
    const anioBase = desde.getFullYear();
    const mesActual = desde.getMonth() + 1;
    const anio = mes >= mesActual ? anioBase : anioBase + 1;
    fecha_vencimiento = ultimoDiaDelMes(anio, mes);
  }

  return {
    ultimo_digito: ultimo,
    mes_sugerido: mes,
    fecha_vencimiento,
    estado: estadoPorVencimiento(fecha_vencimiento),
  };
}

/** Severidad para alertas diferenciadas 7/30/60 días. */
export type VtvSeveridad = "vencida" | "critica" | "proxima" | "media" | "ok" | "sin_dato";

export function vtvSeveridad(dias: number | null): VtvSeveridad {
  if (dias == null) return "sin_dato";
  if (dias < 0) return "vencida";
  if (dias <= 7) return "critica";
  if (dias <= 30) return "proxima";
  if (dias <= 60) return "media";
  return "ok";
}

const SEV_LABEL: Record<VtvSeveridad, string> = {
  vencida: "Vencida",
  critica: "Vence en ≤7 días",
  proxima: "Vence en ≤30 días",
  media: "Vence en ≤60 días",
  ok: "Vigente",
  sin_dato: "Sin fecha",
};

const SEV_TONE: Record<VtvSeveridad, "neutral" | "ok" | "warn" | "danger" | "info"> = {
  vencida: "danger",
  critica: "danger",
  proxima: "warn",
  media: "info",
  ok: "ok",
  sin_dato: "neutral",
};

export function vtvSeveridadLabel(sev: VtvSeveridad): string {
  return SEV_LABEL[sev];
}

export function vtvSeveridadTone(sev: VtvSeveridad) {
  return SEV_TONE[sev];
}

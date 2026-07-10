/** Fechas de negocio del CRM. Las columnas `date` usan siempre la hora de Argentina. */

export const BUSINESS_TIME_ZONE = "America/Argentina/Buenos_Aires";

function dateParts(date: Date, timeZone = BUSINESS_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value;

  const year = get("year");
  const month = get("month");
  const day = get("day");
  if (!year || !month || !day) throw new Error("No se pudo calcular la fecha de negocio");
  return { year, month, day };
}

/** Devuelve YYYY-MM-DD según el día calendario de Argentina, no según UTC. */
export function businessDateISO(date = new Date()): string {
  const { year, month, day } = dateParts(date);
  return `${year}-${month}-${day}`;
}

/** Suma días a una fecha pura sin convertirla a la zona horaria del servidor. */
export function addDaysISO(isoDate: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new Error(`Fecha inválida: ${isoDate}`);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function diffDaysISO(fromISO: string, toISO: string): number {
  const parse = (value: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) throw new Error(`Fecha inválida: ${value}`);
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  };
  return Math.round((parse(toISO) - parse(fromISO)) / 86_400_000);
}

/** Suma meses preservando el día cuando existe y ajustándolo al fin del mes. */
export function addMonthsISO(isoDate: string, months: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new Error(`Fecha inválida: ${isoDate}`);

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const targetFirst = new Date(Date.UTC(year, month + months, 1));
  const lastDay = new Date(Date.UTC(
    targetFirst.getUTCFullYear(),
    targetFirst.getUTCMonth() + 1,
    0,
  )).getUTCDate();
  targetFirst.setUTCDate(Math.min(day, lastDay));
  return targetFirst.toISOString().slice(0, 10);
}

export function currentMonthRangeISO(date = new Date()): { desde: string; hasta: string } {
  const { year, month } = dateParts(date);
  const lastDay = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  return { desde: `${year}-${month}-01`, hasta: `${year}-${month}-${String(lastDay).padStart(2, "0")}` };
}

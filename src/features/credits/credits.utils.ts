export type CreditSchedule = {
  firstDue: Date;
  lastDue: Date;
  nextDue: Date; // próximo vencimiento dentro del plan
  remaining: number; // cuotas que quedan incluyendo el próximo vencimiento. 0 si ya terminó.
  daysToEnd: number; // días hasta el último vencimiento (negativo si ya pasó)
  daysToNext: number; // días hasta el próximo vencimiento
};

export function moneyArs(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtDate(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(d);
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function dueDate10(year: number, monthIndex0: number) {
  const d = new Date(year, monthIndex0, 10);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addMonths10(baseDue10: Date, monthsToAdd: number) {
  const y = baseDue10.getFullYear();
  const m = baseDue10.getMonth() + monthsToAdd;
  return dueDate10(y, m);
}

export function computeCreditSchedule(
  startIso: string | null | undefined,
  installmentCount: number,
  status: "active" | "closed",
  nowArg?: Date
): CreditSchedule | null {
  if (!startIso || !installmentCount || status !== "active") return null;

  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return null;

  const startDay = startOfDay(start);
  const now = startOfDay(nowArg ?? new Date());

  // Primer vencimiento: día 10 del mes de start, o mes siguiente si start es después del 10.
  let firstDue = dueDate10(startDay.getFullYear(), startDay.getMonth());
  if (startDay.getDate() > 10) firstDue = addMonths10(firstDue, 1);

  // Último vencimiento
  const lastDue = addMonths10(firstDue, Math.max(0, installmentCount - 1));

  // Próximo vencimiento "global" (día 10 de este mes, o mes siguiente si ya pasó)
  let nextGlobal = dueDate10(now.getFullYear(), now.getMonth());
  if (now.getTime() > nextGlobal.getTime()) nextGlobal = addMonths10(nextGlobal, 1);

  // Próximo vencimiento real dentro del plan: el mayor entre el inicio y el próximo global
  let nextDue = nextGlobal;
  if (nextDue.getTime() < firstDue.getTime()) nextDue = firstDue;

  // Si el plan ya terminó, remaining = 0, y nextDue lo dejamos como (lastDue + 1 mes) para ordenar/mostrar
  let remaining = 0;
  if (lastDue.getTime() >= nextDue.getTime()) {
    const monthsDiff =
      (lastDue.getFullYear() - nextDue.getFullYear()) * 12 +
      (lastDue.getMonth() - nextDue.getMonth());
    remaining = monthsDiff + 1;
  } else {
    nextDue = addMonths10(lastDue, 1);
  }

  const msDay = 1000 * 60 * 60 * 24;
  const daysToEnd = Math.round((lastDue.getTime() - now.getTime()) / msDay);
  const daysToNext = Math.round((nextDue.getTime() - now.getTime()) / msDay);

  return { firstDue, lastDue, nextDue, remaining, daysToEnd, daysToNext };
}

export function normalizeArPhoneToWhatsApp(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return null;

  // Si ya viene con 54..., lo usamos tal cual.
  if (digits.startsWith("54")) return digits;

  // Formato común local (ej: 2494621182). Para WhatsApp: 549 + area+numero.
  if (digits.length === 10) return `549${digits}`;

  // Si viene con 0 adelante (ej: 0249...), sacamos el 0.
  if (digits.startsWith("0")) {
    const d = digits.slice(1);
    if (d.startsWith("54")) return d;
    if (d.length === 10) return `549${d}`;
    return `54${d}`;
  }

  // Fallback: prefijamos país.
  return `54${digits}`;
}

export function buildWhatsAppMessage(args: {
  clientName: string;
  vehicleLabel: string;
  installmentAmountArs: string;
  nextDueText: string;
  remainingText: string;
  endText: string;
}) {
  const { clientName, vehicleLabel, installmentAmountArs, nextDueText, remainingText, endText } = args;
  return (
    `Hola ${clientName}! 😊\n` +
    `Te escribo para recordarte tu crédito${vehicleLabel ? ` (${vehicleLabel})` : ""}.\n\n` +
    `• Cuota: ${installmentAmountArs}\n` +
    `• Próximo vencimiento: ${nextDueText} (día 10)\n` +
    `• ${remainingText}\n` +
    `• Finaliza aprox: ${endText}\n\n` +
    `¿Querés que coordinemos el pago?`
  );
}

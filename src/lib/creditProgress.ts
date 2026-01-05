// src/lib/creditProgress.ts

export type CreditRow = {
  id: string;
  status: "active" | "closed" | string | null;
  closed_at: string | null;

  client_name: string | null;
  client_phone: string | null;

  vehicle_model: string | null;
  vehicle_version: string | null;
  vehicle_year: number | null;
  vehicle_kms: number | null;

  installment_amount: number | null;
  installment_count: number | null;
  start_date: string | null; // YYYY-MM-DD

  created_at: string;
  updated_at: string;
};

function dateOnly(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addMonths(d: Date, months: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Regla: cuotas mensuales, vencen siempre el día dueDay (10 por defecto).
 * start_date define desde cuándo arranca el plan.
 * - Si start_date <= dueDay: primera cuota vence ese mes en día dueDay.
 * - Si start_date > dueDay: primera cuota vence el mes siguiente en día dueDay.
 */
export function creditProgress(
  c: Pick<CreditRow, "start_date" | "installment_count" | "status" | "closed_at">,
  dueDay = 10
) {
  const total = Number(c.installment_count ?? 0);

  // Si está cerrado, lo tratamos como terminado
  if (c.status === "closed" || !!c.closed_at) {
    return {
      total,
      remaining: 0,
      monthsLeft: 0,
      firstDue: null as Date | null,
      lastDue: null as Date | null,
      endLabel: "Cerrado",
      remainingLabel: "0 cuotas restantes",
    };
  }

  if (!c.start_date || !total || total <= 0) {
    return {
      total: total || 0,
      remaining: total || 0,
      monthsLeft: total || 0,
      firstDue: null as Date | null,
      lastDue: null as Date | null,
      endLabel: "-",
      remainingLabel: total ? `${total} cuotas` : "-",
    };
  }

  const today = dateOnly(new Date());
  const start = new Date(c.start_date + "T00:00:00");

  // primera cuota
  const firstDue = new Date(start.getFullYear(), start.getMonth(), dueDay);
  if (start.getDate() > dueDay) firstDue.setMonth(firstDue.getMonth() + 1);

  // última cuota
  const lastDue = addMonths(firstDue, total - 1);

  // cuántas cuotas "pasaron" por calendario
  let monthsSinceFirst =
    (today.getFullYear() - firstDue.getFullYear()) * 12 +
    (today.getMonth() - firstDue.getMonth());

  // si este mes todavía no llegó el día dueDay, no contamos la cuota del mes como vencida
  const thisMonthDue = new Date(today.getFullYear(), today.getMonth(), dueDay);
  if (today < thisMonthDue) monthsSinceFirst -= 1;

  // cuotas vencidas estimadas = monthsSinceFirst + 1 (porque el mes de firstDue cuenta 1)
  const dueCount = clamp(monthsSinceFirst + 1, 0, total);
  const remaining = clamp(total - dueCount, 0, total);

  // meses restantes (calendario) hasta lastDue
  const monthsLeftRaw =
    (lastDue.getFullYear() - today.getFullYear()) * 12 +
    (lastDue.getMonth() - today.getMonth());

  // si todavía no pasó el día dueDay, este mes todavía cuenta como "pendiente"
  const monthsLeft = clamp(monthsLeftRaw + (today.getDate() <= dueDay ? 1 : 0), 0, total);

  const endLabel = lastDue.toLocaleDateString("es-AR", {
    month: "short",
    year: "numeric",
  });

  return {
    total,
    remaining,
    monthsLeft,
    firstDue,
    lastDue,
    endLabel,
    remainingLabel: `${remaining} cuota${remaining === 1 ? "" : "s"} restante${remaining === 1 ? "" : "s"}`,
  };
}

/**
 * Colores:
 * - rojo: <= 1 mes
 * - amarillo: < 3 meses
 * - verde: resto
 */
export function creditUrgencyBadgeClass(monthsLeft: number) {
  if (monthsLeft <= 1) return "bg-red-100 text-red-800 border border-red-200";
  if (monthsLeft < 3) return "bg-yellow-100 text-yellow-900 border border-yellow-200";
  return "bg-green-100 text-green-800 border border-green-200";
}

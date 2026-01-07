import { supabase } from "@/lib/supabaseBrowser";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

// Regla (estimación): las cuotas vencen el día 10.
// La primera cuota es el 10 del mes de start_date; si start_date es después del 10,
// la primera cuota pasa al 10 del mes siguiente.
function estimateLastInstallmentDate(start_date: string, installment_count: number) {
  const start = new Date(start_date);
  if (!installment_count || installment_count <= 0) return null;

  let first = new Date(start.getFullYear(), start.getMonth(), 10);
  if (start.getDate() > 10) first = new Date(start.getFullYear(), start.getMonth() + 1, 10);

  return addMonths(first, installment_count - 1);
}

export type TopbarAlerts = {
  pendingVehicles: number;
  staleLeads: number;
  reservedStale: number;
  creditsEndingSoon2m: number;
  tasksOverdue: number;
  tasksToday: number;
};

export async function fetchTopbarAlerts(params: {
  role: string | null;
  userId: string | null;
}): Promise<TopbarAlerts> {
  const { role, userId } = params;
  const isAdmin = role === "admin" || role === "manager";
  const nowIso = new Date().toISOString();

  const today = startOfDay(new Date());
  const tomorrow = startOfDay(new Date(Date.now() + 24 * 60 * 60 * 1000));

  async function safeCount(q: any): Promise<number> {
    const r = await q;
    if (r?.error) return 0;
    return r?.count ?? 0;
  }

  // Vehículos pendientes
  let vq = supabase
    .from("vehicles")
    .select("id", { count: "exact", head: true })
    .in("status", ["draft", "incoming", "preparing"]);
  if (!isAdmin && userId) vq = vq.eq("created_by", userId);
  const pendingVehicles = await safeCount(vq);

  // Leads sin tocar hace X días (sin spam)
  const STALE_LEADS_DAYS = 3;
  const staleSince = new Date();
  staleSince.setDate(staleSince.getDate() - STALE_LEADS_DAYS);
  let lq = supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    // no molestamos por leads cerrados
    .not("stage", "in", "(won,lost)")
    .or(`last_contact_at.is.null,last_contact_at.lt.${staleSince.toISOString()}`);
  if (!isAdmin && userId) lq = lq.eq("assigned_to", userId);
  const staleLeads = await safeCount(lq);

  // Reservado hace X días sin cerrar (estimación por updated_at)
  const RESERVED_STALE_DAYS = 7;
  const reservedSince = new Date();
  reservedSince.setDate(reservedSince.getDate() - RESERVED_STALE_DAYS);
  let rq = supabase
    .from("vehicles")
    .select("id", { count: "exact", head: true })
    .eq("status", "reserved")
    .lt("updated_at", reservedSince.toISOString());
  if (!isAdmin && userId) rq = rq.eq("created_by", userId);
  const reservedStale = await safeCount(rq);

  // Créditos por finalizar: últimos 2 meses
  let creditsEndingSoon2m = 0;
  const creditsActiveRows = await supabase
    .from("credits")
    .select("id,start_date,installment_count,status")
    .eq("status", "active")
    .limit(500);

  if (!creditsActiveRows.error) {
    const limit = startOfDay(addMonths(today, 2));

    creditsEndingSoon2m = ((creditsActiveRows.data ?? []) as any[]).reduce((acc, c) => {
      if (!c.start_date || !c.installment_count) return acc;
      const last = estimateLastInstallmentDate(c.start_date, Number(c.installment_count));
      if (!last) return acc;

      const lastDay = startOfDay(last);
      // en ventana [hoy, hoy + 2 meses]
      if (lastDay.getTime() >= today.getTime() && lastDay.getTime() <= limit.getTime()) return acc + 1;
      return acc;
    }, 0);
  }

  // Tareas vencidas y de hoy
  // Nota: RLS se encarga de mostrar lo que corresponde por rol/dealership.
  const tasksOverdue = await safeCount(
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .not("due_at", "is", null)
      .lt("due_at", today.toISOString())
  );

  const tasksToday = await safeCount(
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .not("due_at", "is", null)
      .gte("due_at", today.toISOString())
      .lt("due_at", tomorrow.toISOString())
  );

  return { pendingVehicles, staleLeads, reservedStale, creditsEndingSoon2m, tasksOverdue, tasksToday };
}

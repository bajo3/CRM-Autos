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

function parseDateLocal(input: string) {
  // Si viene como DATE (YYYY-MM-DD), lo parseamos como fecha local para evitar corrimientos por timezone.
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(input).trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(input);
}

// Regla (estimación): las cuotas vencen el día 10.
// La primera cuota es el 10 del mes de start_date; si start_date es después del 10,
// la primera cuota pasa al 10 del mes siguiente.
function estimateLastInstallmentDate(start_date: string, installment_count: number) {
  const start = parseDateLocal(start_date);
  if (!installment_count || installment_count <= 0) return null;

  let first = new Date(start.getFullYear(), start.getMonth(), 10);
  if (start.getDate() > 10) first = new Date(start.getFullYear(), start.getMonth() + 1, 10);

  return addMonths(first, installment_count - 1);
}

export type TopbarAlerts = {
  pendingVehicles: number;
  overdueLeads: number;
  overdueTasks: number;
  creditsEndingSoon2m: number;
};

export async function fetchTopbarAlerts(params: {
  role: string | null;
  userId: string | null;
}): Promise<TopbarAlerts> {
  const { role, userId } = params;
  const isAdmin = role === "admin" || role === "manager";
  const nowIso = new Date().toISOString();

  async function safeCount(q: any): Promise<number> {
    const r = await q;
    if (r?.error) return 0;
    return r?.count ?? 0;
  }

  // Vehículos pendientes
  let vq = supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("status", "draft");
  if (!isAdmin && userId) vq = vq.eq("created_by", userId);
  const pendingVehicles = await safeCount(vq);

  // Leads vencidos (next_follow_up_at < ahora)
  let lq = supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .not("next_follow_up_at", "is", null)
    .lt("next_follow_up_at", nowIso);
  if (!isAdmin && userId) lq = lq.eq("assigned_to", userId);
  const overdueLeads = await safeCount(lq);

  // Tareas vencidas
  const overdueTasks = await safeCount(
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .not("due_at", "is", null)
      .lt("due_at", nowIso)
  );

  // Créditos por finalizar: últimos 2 meses
  let creditsEndingSoon2m = 0;
  const creditsActiveRows = await supabase
    .from("credits")
    .select("id,start_date,installment_count,status")
    .eq("status", "active")
    .limit(2000);

  if (!creditsActiveRows.error) {
    const today = startOfDay(new Date());
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

  return { pendingVehicles, overdueLeads, overdueTasks, creditsEndingSoon2m };
}

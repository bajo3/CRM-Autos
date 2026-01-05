import { supabase } from "@/lib/supabaseBrowser";

export type DashboardStats = {
  vehiclesTotal: number;
  vehiclesPublished: number;
  vehiclesReserved: number;

  leadsActive: number;
  // No tipamos a LeadStage porque tu enum real en DB puede variar.
  // Esto evita errores 400 cuando el dashboard intenta filtrar por un valor que no existe.
  leadsByStage: Record<string, number>;
  leadsCreated7d: number;

  creditsActive: number;
  creditsCreated7d: number;
  creditsEndingSoon2m: number; // créditos activos que están a 2 meses o menos de terminar (estimación frontend)

  tasksOpen: number;
  tasksOverdue: number;
  tasksDone7d: number;

  wonPerMonth: { month: string; value: number }[]; // últimos 6 meses
};

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
// Calcula la fecha de la última cuota (día 10) según start_date + installment_count.
export function estimateLastInstallmentDate(start_date: string, installment_count: number) {
  const start = new Date(start_date);
  if (!installment_count || installment_count <= 0) return null;

  // primera cuota: día 10 del mes de start_date (o el siguiente si start es después del 10)
  let first = new Date(start.getFullYear(), start.getMonth(), 10);
  if (start.getDate() > 10) first = new Date(start.getFullYear(), start.getMonth() + 1, 10);

  // última cuota = first + (installment_count - 1) meses
  return addMonths(first, installment_count - 1);
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const now = new Date();
  const since7 = new Date(now);
  since7.setDate(now.getDate() - 7);

  // helpers “tolerantes” para que el dashboard no explote si hay enums/columnas distintas
  async function safeCount(q: any): Promise<number> {
    const r = await q;
    if (r?.error) return 0;
    return r?.count ?? 0;
  }

  function stageGuess(stages: string[]) {
    const lower = stages.map((s) => s.toLowerCase());
    const find = (cands: string[]) => {
      for (const c of cands) {
        const idx = lower.indexOf(c);
        if (idx >= 0) return stages[idx];
      }
      return null;
    };

    const won = find(["won", "closed_won", "ganado", "vendido", "sold"]);
    const lost = find(["lost", "closed_lost", "perdido", "dead", "no_sale"]);
    return { won, lost };
  }

  // VEHÍCULOS
  const vehiclesTotal = await safeCount(supabase.from("vehicles").select("id", { count: "exact", head: true }));
  // Si tu enum/status no tiene estos valores, devolvemos 0 (evita 400)
  const vehiclesPublished = await safeCount(
    supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("status", "published")
  );
  const vehiclesReserved = await safeCount(
    supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("status", "reserved")
  );

  // LEADS (conteos por stage) — sin filtrar por valores “hardcodeados”
  // Traemos stages y contamos en frontend para no romper si el enum real no coincide.
  const leadsByStage: Record<string, number> = {};
  const leadsStagesRows = await supabase.from("leads").select("stage").limit(5000);
  if (leadsStagesRows.error) throw leadsStagesRows.error;

  for (const r of leadsStagesRows.data ?? []) {
    const s = String((r as any).stage ?? "");
    if (!s) continue;
    leadsByStage[s] = (leadsByStage[s] ?? 0) + 1;
  }

  const totalLeads = Object.values(leadsByStage).reduce((a, b) => a + b, 0);
  const keys = Object.keys(leadsByStage);
  const { won: wonStage, lost: lostStage } = stageGuess(keys);

  const leadsActive = totalLeads - (wonStage ? leadsByStage[wonStage] ?? 0 : 0) - (lostStage ? leadsByStage[lostStage] ?? 0 : 0);

  const leadsCreated7 = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since7.toISOString());
  if (leadsCreated7.error) throw leadsCreated7.error;

  // CRÉDITOS
  const creditsActive = await safeCount(
    supabase.from("credits").select("id", { count: "exact", head: true }).eq("status", "active")
  );

  const creditsCreated7 = await supabase
    .from("credits")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since7.toISOString());
  if (creditsCreated7.error) throw creditsCreated7.error;

  // Para calcular "créditos por finalizar (≤2 meses)", traemos start_date + installment_count de activos
  const creditsActiveRows = await supabase
    .from("credits")
    .select("id,start_date,installment_count,status")
    .eq("status", "active")
    .limit(500);
  // Si tu enum/status no tiene "active", no rompemos el dashboard.
  if (creditsActiveRows.error) {
    // seguimos con creditsEndingSoon2m=0
  }

  const creditsEndingSoon2m = ((creditsActiveRows as any)?.data ?? []).reduce((acc: number, c: any) => {
    if (!c.start_date || !c.installment_count) return acc;
    const last = estimateLastInstallmentDate(c.start_date, Number(c.installment_count));
    if (!last) return acc;

    const today = startOfDay(now);
    const limit = startOfDay(addMonths(today, 2));
    const lastDay = startOfDay(last);
    return lastDay.getTime() >= today.getTime() && lastDay.getTime() <= limit.getTime() ? acc + 1 : acc;
  }, 0);

  // TAREAS
  const tasksOpenRes = await supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "open");
  if (tasksOpenRes.error) throw tasksOpenRes.error;

  const tasksOverdueRes = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("status", "open")
    .lt("due_at", now.toISOString());
  if (tasksOverdueRes.error) throw tasksOverdueRes.error;

  const tasksDone7 = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("status", "done")
    .gte("done_at", since7.toISOString());
  if (tasksDone7.error) throw tasksDone7.error;

  // "Ventas" = leads ganados (won) últimos 6 meses, agrupados en frontend
  const start6 = new Date(now);
  start6.setMonth(now.getMonth() - 5);
  start6.setDate(1);
  start6.setHours(0, 0, 0, 0);

  let wonRows: any = { data: [] };
  if (wonStage) {
    const w = await supabase
      .from("leads")
      .select("id,updated_at,created_at,stage")
      .eq("stage", wonStage)
      .gte("updated_at", start6.toISOString())
      .limit(2000);
    if (!w.error) wonRows = w;
  }

  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const bucket = new Map<string, number>();
  for (const r of wonRows.data ?? []) {
    const dt = new Date(r.updated_at ?? r.created_at);
    const k = monthKey(dt);
    bucket.set(k, (bucket.get(k) ?? 0) + 1);
  }

  const months: { month: string; value: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(start6);
    d.setMonth(start6.getMonth() + i);
    const k = monthKey(d);
    const label = d.toLocaleDateString("es-AR", { month: "short" });
    months.push({ month: label.charAt(0).toUpperCase() + label.slice(1), value: bucket.get(k) ?? 0 });
  }

  return {
    vehiclesTotal,
    vehiclesPublished,
    vehiclesReserved,

    leadsActive,
    leadsByStage,
    leadsCreated7d: leadsCreated7.count ?? 0,

    creditsActive,
    creditsCreated7d: creditsCreated7.count ?? 0,
    creditsEndingSoon2m,

    tasksOpen: tasksOpenRes.count ?? 0,
    tasksOverdue: tasksOverdueRes.count ?? 0,
    tasksDone7d: tasksDone7.count ?? 0,

    wonPerMonth: months,
  };
}

export type SellerActivityRow = {
  user_id: string;
  full_name: string | null;
  role: string | null;
  leadsTouchedToday: number;
  followupsOverdue: number;
  vehiclesMoved7d: number;
};

function startOfLocalDayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function fetchSellerActivity(): Promise<SellerActivityRow[]> {
  const todayIso = startOfLocalDayIso();
  const nowIso = new Date().toISOString();
  const since7 = new Date();
  since7.setDate(since7.getDate() - 7);

  const { data: users, error: uErr } = await supabase
    .from("profiles")
    .select("user_id,full_name,role")
    .in("role", ["admin", "manager", "seller"])
    .order("full_name", { ascending: true });
  if (uErr) throw uErr;

  const list = (users ?? []) as any[];
  const out: SellerActivityRow[] = [];

  for (const p of list) {
    const uid = String(p.user_id);

    const leadsTouchedToday = await (async () => {
      const r = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", uid)
        .gte("last_contact_at", todayIso);
      return r?.error ? 0 : r.count ?? 0;
    })();

    const followupsOverdue = await (async () => {
      const r = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", uid)
        .not("next_follow_up_at", "is", null)
        .lt("next_follow_up_at", nowIso);
      return r?.error ? 0 : r.count ?? 0;
    })();

    const vehiclesMoved7d = await (async () => {
      // Preferimos eventos si existe la tabla; sino, caemos a vehicles.updated_at
      const ev = await supabase
        .from("crm_events")
        .select("id", { count: "exact", head: true })
        .eq("entity_type", "vehicle")
        .eq("created_by", uid)
        .gte("created_at", since7.toISOString());
      if (!ev?.error) return ev.count ?? 0;

      const r = await supabase
        .from("vehicles")
        .select("id", { count: "exact", head: true })
        .eq("created_by", uid)
        .gte("updated_at", since7.toISOString());
      return r?.error ? 0 : r.count ?? 0;
    })();

    out.push({
      user_id: uid,
      full_name: p.full_name ?? null,
      role: p.role ?? null,
      leadsTouchedToday,
      followupsOverdue,
      vehiclesMoved7d,
    });
  }

  return out;
}

import { supabase } from "@/lib/supabaseBrowser";
import { toErrorMessage } from "@/lib/errors";
import type { LeadInsert, LeadRow, LeadStage, LeadUpdate } from "./leads.types";
import type { LeadEventRow, LeadEventType } from "./leadEvents.types";

const TABLE = "leads";
const EVENTS_TABLE = "lead_events";

async function logLeadEvent(
  lead_id: string,
  type: LeadEventType,
  message?: string | null,
  meta?: any
) {
  try {
    await supabase.from(EVENTS_TABLE).insert({
      lead_id,
      type,
      message: message ?? null,
      meta: meta ?? null,
    });
  } catch {
    // no-op: el módulo Leads debe funcionar aunque el timeline no esté configurado todavía.
  }
}

export async function getLeadById(id: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      "id,name,phone,interest,stage,notes,assigned_to,vehicle_id,last_contact_at,next_follow_up_at,lost_reason,created_at,updated_at"
    )
    .eq("id", id)
    .single();
  if (error) throw new Error(toErrorMessage(error, "No pude cargar el lead"));
  return data as LeadRow;
}

export async function listLeadEvents(lead_id: string) {
  const { data, error } = await supabase
    .from(EVENTS_TABLE)
    .select("id,lead_id,type,message,meta,created_by,created_at")
    .eq("lead_id", lead_id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(toErrorMessage(error, "No pude cargar el historial"));
  return (data ?? []) as LeadEventRow[];
}

export async function addLeadNoteEvent(lead_id: string, note: string) {
  const clean = note.trim();
  if (!clean) throw new Error("Nota vacía");
  await logLeadEvent(lead_id, "note", clean);
}

export async function getMyUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}

export async function getMyRole(): Promise<"admin" | "seller" | null> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) return null;

  const { data: p, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", uid)
    .maybeSingle();

  if (error) return null;
  const role = (p?.role ?? null) as string | null;
  if (role === "admin" || role === "seller") return role;
  return null;
}

export async function listLeads(params?: {
  stage?: LeadStage | "all";
  mine?: boolean;
  overdue?: boolean;
  search?: string;
  userId?: string | null;
  assignedTo?: "all" | "unassigned" | string; // ✅ filtro por asignación
  page?: number;
  pageSize?: number;
}) {
  let q = supabase
    .from(TABLE)
    .select(
      "id,name,phone,interest,stage,notes,assigned_to,vehicle_id,last_contact_at,next_follow_up_at,lost_reason,created_at,updated_at"
    )
    .order("created_at", { ascending: false });

  if (params?.stage && params.stage !== "all") q = q.eq("stage", params.stage);

  if (params?.mine && params.userId) q = q.eq("assigned_to", params.userId);

  // ✅ nuevo: filtro por asignación (Todos / Sin asignar / user_id)
  if (params?.assignedTo && params.assignedTo !== "all") {
    if (params.assignedTo === "unassigned") q = q.is("assigned_to", null);
    else q = q.eq("assigned_to", params.assignedTo);
  }

  if (params?.overdue) q = q.lt("next_follow_up_at", new Date().toISOString());

  if (params?.search && params.search.trim()) {
    const s = params.search.trim().replaceAll('"', "");
    q = q.or(`name.ilike.%${s}%,phone.ilike.%${s}%,interest.ilike.%${s}%`);
  }

  const page = Math.max(0, params?.page ?? 0);
  const pageSize = Math.min(200, Math.max(1, params?.pageSize ?? 50));
  q = q.range(page * pageSize, page * pageSize + pageSize - 1);

  const { data, error } = await q;
  if (error) throw new Error(toErrorMessage(error, "No pude listar leads"));
  return (data ?? []) as LeadRow[];
}

export async function createLead(input: LeadInsert) {
  const payload: any = {
    name: input.name,
    phone: input.phone ?? null,
    interest: input.interest ?? null,
    stage: input.stage ?? "new",
    notes: input.notes ?? null,
    assigned_to: input.assigned_to ?? null,
    vehicle_id: input.vehicle_id ?? null,
    next_follow_up_at: input.next_follow_up_at ?? null,
    lost_reason: input.lost_reason ?? null,
  };

  // ✅ Regla: si NO sos admin, los leads que creás quedan asignados a vos.
  // (si el admin reasigna, desaparecen para el seller)
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user?.id ?? null;
  if (uid) {
    const role = await getMyRole();
    if (role !== "admin") payload.assigned_to = uid;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select(
      "id,name,phone,interest,stage,notes,assigned_to,vehicle_id,last_contact_at,next_follow_up_at,lost_reason,created_at,updated_at"
    )
    .single();

  if (error) throw new Error(toErrorMessage(error, "No pude crear el lead"));
  const created = data as LeadRow;
  await logLeadEvent(created.id, "created", "Lead creado", {
    name: created.name,
    stage: created.stage,
  });
  return created;
}

export async function updateLead(id: string, patch: LeadUpdate, opts?: { skipEvent?: boolean }) {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch as any)
    .eq("id", id)
    .select(
      "id,name,phone,interest,stage,notes,assigned_to,vehicle_id,last_contact_at,next_follow_up_at,lost_reason,created_at,updated_at"
    )
    .single();

  if (error) throw new Error(toErrorMessage(error, "No pude actualizar el lead"));
  const row = data as LeadRow;

  if (!opts?.skipEvent) {
    if (patch.stage) {
      await logLeadEvent(id, "stage_changed", `Etapa: ${patch.stage}`);
    } else if ("assigned_to" in patch) {
      await logLeadEvent(id, "assigned", "Asignación actualizada", { assigned_to: (patch as any).assigned_to ?? null });
    } else {
      await logLeadEvent(id, "updated", "Lead actualizado", { patch });
    }
  }

  return row;
}

export async function markContactedNow(id: string) {
  const row = await updateLead(id, { last_contact_at: new Date().toISOString() }, { skipEvent: true });
  await logLeadEvent(id, "contacted", "Contactado hoy");
  return row;
}

export async function setFollowUp(id: string, isoOrNull: string | null) {
  const row = await updateLead(id, { next_follow_up_at: isoOrNull }, { skipEvent: true });
  await logLeadEvent(id, "followup_set", isoOrNull ? "Seguimiento programado" : "Seguimiento limpiado", {
    next_follow_up_at: isoOrNull,
  });
  return row;
}

/**
 * ✅ Lista de usuarios del tenant (para asignar leads)
 * IMPORTANT: Si tu profiles NO tiene full_name, cambiá el select acá (name/display_name).
 */
export async function listAssignees() {
  // Nota: muchos tenants tienen profiles.is_active en NULL al inicio.
  // Por eso traemos (true o null) y hacemos fallback si no hay roles configurados aún.
  const base = () =>
    supabase
      .from("profiles")
      .select("user_id, full_name, role, is_active")
      .or("is_active.is.null,is_active.eq.true")
      .order("full_name", { ascending: true });

  // 1) Preferimos roles típicos de asignación
  const { data: preferred, error: e1 } = await base().in("role", ["seller", "admin"]);
  if (e1) throw new Error(toErrorMessage(e1, "No pude cargar el equipo"));

  const rows = preferred ?? [];
  if (rows.length > 0) {
    return rows.map((r: any) => ({
      user_id: r.user_id,
      full_name: r.full_name ?? null,
      role: r.role ?? null,
    }));
  }

  // 2) Fallback: si nadie tiene role seteado, mostramos igual el equipo (evita “lista vacía”)
  const { data: all, error: e2 } = await base();
  if (e2) throw new Error(toErrorMessage(e2, "No pude cargar el equipo"));

  return (all ?? []).map((r: any) => ({
    user_id: r.user_id,
    full_name: r.full_name ?? null,
    role: r.role ?? null,
  }));
}


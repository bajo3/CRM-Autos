import { supabase } from "@/lib/supabaseBrowser";
import type { TaskInsert, TaskRow, TaskStatus, TaskUpdate } from "./tasks.types";

const TABLE = "tasks";
const SELECT =
  "id,dealership_id,created_by,assigned_to,audience,title,description,priority,status,due_at,done_at,canceled_at,entity_type,entity_id,created_at,updated_at";

export async function listTasks(params: {
  status?: TaskStatus | "all";
  assignedTo?: "all" | "team" | string; // admin-only filtro UI; RLS igual filtra
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const { status = "all", assignedTo = "all", search = "", page = 0, pageSize = 50 } = params;

  let q = supabase
    .from(TABLE)
    .select(SELECT)
    .order("status", { ascending: true }) // open primero (enum order)
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (status !== "all") q = q.eq("status", status);

  if (assignedTo === "team") q = q.eq("audience", "team");
  else if (assignedTo === "unassigned") q = q.is("assigned_to", null);
  else if (assignedTo !== "all") q = q.eq("assigned_to", assignedTo);

  const s = search.trim();
  if (s) {
    const esc = s.replace(/[%_]/g, (m) => `\\${m}`);
    q = q.or(`title.ilike.%${esc}%,description.ilike.%${esc}%`);
  }

  const safePage = Math.max(0, page);
  const safeSize = Math.min(200, Math.max(1, pageSize));
  q = q.range(safePage * safeSize, safePage * safeSize + safeSize - 1);

  const { data, error } = await q;
  if (error) throw new Error(error.message ?? "Error");
  return (data ?? []) as TaskRow[];
}

export async function createTask(payload: TaskInsert) {
  const { data, error } = await supabase.from(TABLE).insert(payload).select(SELECT).single();
  if (error) throw new Error(error.message ?? "Error");
  return data as TaskRow;
}

export async function updateTask(payload: TaskUpdate) {
  const { id, ...rest } = payload;
  const { data, error } = await supabase.from(TABLE).update(rest).eq("id", id).select(SELECT).single();
  if (error) throw new Error(error.message ?? "Error");
  return data as TaskRow;
}

export async function completeTask(id: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status: "done", done_at: new Date().toISOString(), canceled_at: null })
    .eq("id", id)
    .select(SELECT)
    .single();
  if (error) throw new Error(error.message ?? "Error");
  return data as TaskRow;
}


export async function cancelTask(id: string) {
  const { error } = await supabase
    .from(TABLE)
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function reopenTask(id: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status: "open", done_at: null, canceled_at: null })
    .eq("id", id)
    .select(SELECT)
    .single();
  if (error) throw new Error(error.message ?? "Error");
  return data as TaskRow;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) throw new Error(error.message ?? "Error");
}

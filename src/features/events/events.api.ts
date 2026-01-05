import { supabase } from "@/lib/supabaseBrowser";
import { toErrorMessage } from "@/lib/errors";
import type { CrmEventRow, EntityType } from "./events.types";

const TABLE = "crm_events";

export async function logCrmEvent(args: {
  entity_type: EntityType;
  entity_id: string;
  type: string;
  payload?: any;
}) {
  try {
    await supabase.from(TABLE).insert({
      entity_type: args.entity_type,
      entity_id: args.entity_id,
      type: args.type,
      payload: args.payload ?? null,
    });
  } catch {
    // no-op: el CRM debe funcionar aunque el timeline unificado no esté instalado todavía.
  }
}

export async function listCrmEvents(args: {
  entity_type: EntityType;
  entity_id: string;
  limit?: number;
}): Promise<CrmEventRow[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id,dealership_id,entity_type,entity_id,type,payload,created_by,created_at")
    .eq("entity_type", args.entity_type)
    .eq("entity_id", args.entity_id)
    .order("created_at", { ascending: false })
    .limit(Math.min(200, Math.max(1, args.limit ?? 50)));

  if (error) throw new Error(toErrorMessage(error, "No pude cargar el timeline"));
  return (data ?? []) as any;
}

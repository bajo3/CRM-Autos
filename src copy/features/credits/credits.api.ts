import { supabase } from "@/lib/supabaseBrowser";
import { toErrorMessage } from "@/lib/errors";
import type { CreditRow, CreditStatus } from "./credits.types";

const TABLE = "credits";

export async function listCredits(params?: { status?: CreditStatus | "all"; search?: string; page?: number; pageSize?: number }) {
  let q = supabase
    .from(TABLE)
    .select(
      "id,status,closed_at,client_name,client_phone,vehicle_model,vehicle_version,vehicle_year,vehicle_kms,installment_amount,installment_count,start_date,created_at,updated_at"
    )
    .order("created_at", { ascending: false });

  if (params?.status && params.status !== "all") q = q.eq("status", params.status);

  if (params?.search && params.search.trim()) {
    const s = params.search.trim().replaceAll('"', "");
    q = q.or(
      `client_name.ilike.%${s}%,client_phone.ilike.%${s}%,vehicle_model.ilike.%${s}%,vehicle_version.ilike.%${s}%`
    );
  }

  const page = Math.max(0, params?.page ?? 0);
  const pageSize = Math.min(200, Math.max(1, params?.pageSize ?? 50));
  q = q.range(page * pageSize, page * pageSize + pageSize - 1);

  const { data, error } = await q;
  if (error) throw new Error(toErrorMessage(error, "No pude listar créditos"));
  return (data ?? []) as CreditRow[];
}

export async function createCredit(payload: Omit<CreditRow, "id" | "created_at" | "updated_at" | "closed_at" | "status"> & { status?: CreditStatus }) {
  const insert: any = {
    status: payload.status ?? "active",
    client_name: payload.client_name,
    client_phone: payload.client_phone ?? null,
    vehicle_model: payload.vehicle_model ?? null,
    vehicle_version: payload.vehicle_version ?? null,
    vehicle_year: payload.vehicle_year ?? null,
    vehicle_kms: payload.vehicle_kms ?? null,
    installment_amount: payload.installment_amount,
    installment_count: payload.installment_count,
    start_date: payload.start_date,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(insert)
    .select(
      "id,status,closed_at,client_name,client_phone,vehicle_model,vehicle_version,vehicle_year,vehicle_kms,installment_amount,installment_count,start_date,created_at,updated_at"
    )
    .single();
  if (error) throw new Error(toErrorMessage(error, "No pude crear el crédito"));
  return data as CreditRow;
}

export async function updateCredit(id: string, patch: Partial<CreditRow>) {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch as any)
    .eq("id", id)
    .select(
      "id,status,closed_at,client_name,client_phone,vehicle_model,vehicle_version,vehicle_year,vehicle_kms,installment_amount,installment_count,start_date,created_at,updated_at"
    )
    .single();
  if (error) throw new Error(toErrorMessage(error, "No pude actualizar el crédito"));
  return data as CreditRow;
}

export async function closeCredit(id: string) {
  return updateCredit(id, { status: "closed", closed_at: new Date().toISOString() } as any);
}

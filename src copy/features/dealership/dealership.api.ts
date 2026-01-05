import { supabase } from "@/lib/supabaseBrowser";
import { toErrorMessage } from "@/lib/errors";
import type { DealershipRow, DealershipUpdate } from "./dealership.types";

const TABLE = "dealerships";
// Usamos "*" para tolerar schemas distintos (evita 400 si faltan columnas como logo_url/currency).
const SELECT = "*";

export async function getDealership(id: string) {
  const { data, error } = await supabase.from(TABLE).select(SELECT).eq("id", id).maybeSingle();
  // maybeSingle(): si no hay fila, data=null y error=null
  if (error) throw new Error(toErrorMessage(error, "No pude cargar la agencia"));
  if (!data) throw new Error("No existe la agencia (dealerships) para este dealership_id");
  return data as DealershipRow;
}

export async function updateDealership(id: string, patch: DealershipUpdate) {
  const { data, error } = await supabase.from(TABLE).update(patch).eq("id", id).select(SELECT).single();
  if (error) throw new Error(toErrorMessage(error, "No pude guardar la agencia"));
  return data as DealershipRow;
}

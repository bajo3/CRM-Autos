/**
 * Gestión de la cuenta de MercadoLibre conectada por empresa (lado servidor).
 * Lee/escribe `ml_cuenta` vía Supabase y refresca el token cuando vence.
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";
import { refrescarToken } from "./client";

export type MlCuenta = Database["public"]["Tables"]["ml_cuenta"]["Row"];

/** Devuelve la cuenta ML conectada de una empresa (o null). */
export async function obtenerCuenta(empresaId: string): Promise<MlCuenta | null> {
  const sb = createClient();
  const { data } = await sb
    .from("ml_cuenta")
    .select("*")
    .eq("empresa_id", empresaId)
    .maybeSingle();
  return data ?? null;
}

/**
 * Devuelve un access_token válido para la empresa, refrescándolo y
 * persistiéndolo si está por vencer. Null si la empresa no tiene cuenta.
 */
export async function tokenValido(empresaId: string): Promise<string | null> {
  const sb = createClient();
  const { data: cuenta } = await sb
    .from("ml_cuenta")
    .select("*")
    .eq("empresa_id", empresaId)
    .maybeSingle();
  if (!cuenta || !cuenta.access_token) return null;

  const vence = cuenta.token_expira ? new Date(cuenta.token_expira).getTime() : 0;
  // Margen de 1 minuto.
  if (Date.now() < vence - 60_000) return cuenta.access_token;

  if (!cuenta.refresh_token) return cuenta.access_token;
  try {
    const t = await refrescarToken(cuenta.refresh_token);
    const expira = new Date(Date.now() + t.expires_in * 1000).toISOString();
    await sb
      .from("ml_cuenta")
      .update({
        access_token: t.access_token,
        refresh_token: t.refresh_token,
        token_expira: expira,
        scope: t.scope,
      })
      .eq("empresa_id", empresaId);
    return t.access_token;
  } catch {
    // Si falla el refresh devolvemos el token viejo; la llamada que lo use
    // expondrá el error real de ML.
    return cuenta.access_token;
  }
}

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

/**
 * Cliente Supabase con service role: SOLO para código server-side que corre
 * sin sesión de usuario (webhook de WhatsApp, worker de programados).
 * Bypassea RLS — cada consulta debe filtrar empresa_id explícitamente.
 * Nunca importar desde componentes de cliente.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY en el entorno (requerida por el webhook/worker de WhatsApp).",
    );
  }
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

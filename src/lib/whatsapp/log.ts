import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

type TipoEvento = Database["public"]["Enums"]["tipo_wa_evento"];

/** Auditoría del módulo WhatsApp. Nunca lanza: un log fallido no corta el flujo. */
export async function registrarEventoWa(
  sb: SupabaseClient<Database>,
  params: {
    empresaId: string;
    tipo: TipoEvento;
    detalle?: string;
    datos?: Record<string, unknown>;
    usuarioId?: string | null;
  },
): Promise<void> {
  const { error } = await sb.from("whatsapp_evento_log").insert({
    empresa_id: params.empresaId,
    tipo: params.tipo,
    detalle: params.detalle ?? null,
    datos: (params.datos ?? null) as never,
    usuario_id: params.usuarioId ?? null,
  });
  if (error) {
    console.error("[whatsapp] no se pudo registrar evento:", error.message);
  }
}

import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";

type Dato = Record<string, unknown> | null | undefined;

/** Serializa a JSON plano para la columna jsonb (o null). */
function jsonb(v: Dato) {
  return v == null ? null : JSON.parse(JSON.stringify(v));
}

/**
 * Registra una entrada de auditoría en `historial_cambio`.
 * Pensado para acciones clave (cambio de precio, venta, baja de auto…).
 * Nunca lanza: un fallo de auditoría no debe tumbar la operación principal.
 */
export async function registrarCambio(opts: {
  accion: string;
  entidad: string;
  entidad_id?: string | null;
  valor_anterior?: Dato;
  valor_nuevo?: Dato;
  ctxEmpresaId?: string | null;
  ctxUsuarioId?: string | null;
}): Promise<void> {
  try {
    let empresaId = opts.ctxEmpresaId ?? undefined;
    let usuarioId = opts.ctxUsuarioId ?? undefined;
    if (!empresaId) {
      const ctx = await getSessionContext();
      empresaId = ctx?.profile?.empresa_id ?? undefined;
      usuarioId = ctx?.profile?.id ?? undefined;
    }
    if (!empresaId) return;

    const sb = createClient();
    await sb.from("historial_cambio").insert({
      empresa_id: empresaId,
      usuario_id: usuarioId ?? null,
      accion: opts.accion,
      entidad: opts.entidad,
      entidad_id: opts.entidad_id ?? null,
      valor_anterior: jsonb(opts.valor_anterior),
      valor_nuevo: jsonb(opts.valor_nuevo),
    });
  } catch {
    // Silencioso a propósito.
  }
}

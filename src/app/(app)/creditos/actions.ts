"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { formatARS, formatDate } from "@/lib/format";

export type FormState = { error?: string; ok?: boolean };

const schema = z.object({
  monto: z.union([z.coerce.number().nonnegative("El monto no puede ser negativo"), z.literal("")])
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  fecha: z.string().optional(),
  observacion: z.string().optional(),
});

/**
 * Registra el pago de la próxima cuota de un crédito.
 *
 * Versión segura mínima sobre el esquema actual: avanza `cuota_actual`,
 * recalcula `estado` (activo → por_terminar en la anteúltima → finalizado)
 * y deja el detalle del pago (monto/fecha/obs) como línea en
 * `credito.observaciones`. El historial estructurado por cuota requiere la
 * migración propuesta `13_pago_cuota.sql`.
 */
export async function registrarPago(creditoId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) return { error: "Sesión inválida." };
  if (!can(ctx.profile.rol, "creditos.cobrar")) {
    return { error: "No tenés permiso para registrar pagos." };
  }

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Revisá los campos." };

  const sb = createClient();
  // RLS limita la lectura a la propia empresa.
  const { data: credito, error: readErr } = await sb
    .from("credito")
    .select("id, cantidad_cuotas, cuota_actual, estado, observaciones")
    .eq("id", creditoId)
    .maybeSingle<{
      id: string; cantidad_cuotas: number; cuota_actual: number;
      estado: string; observaciones: string | null;
    }>();
  if (readErr) return { error: `No se pudo leer el crédito: ${readErr.message}` };
  if (!credito) return { error: "Crédito no encontrado." };

  if (credito.estado === "finalizado" || credito.estado === "cancelado") {
    return { error: "El crédito ya está cerrado; no admite más pagos." };
  }
  if (credito.cuota_actual >= credito.cantidad_cuotas) {
    return { error: "Todas las cuotas ya figuran pagadas." };
  }

  const cuotaPagada = credito.cuota_actual + 1;
  const total = credito.cantidad_cuotas;

  // Recalcular estado del crédito.
  let nuevoEstado: "activo" | "por_terminar" | "finalizado" = "activo";
  if (cuotaPagada >= total) nuevoEstado = "finalizado";
  else if (cuotaPagada === total - 1) nuevoEstado = "por_terminar";

  // Registro del pago en observaciones (versión sin tabla de pagos).
  const fechaPago = (parsed.data.fecha || "").trim() || new Date().toISOString().slice(0, 10);
  const partes = [
    `• ${formatDate(fechaPago)} — Cuota ${cuotaPagada}/${total}`,
    parsed.data.monto != null ? formatARS(parsed.data.monto) : null,
    parsed.data.observacion?.trim() || null,
  ].filter(Boolean);
  const linea = partes.join(" · ");
  const nuevasObs = credito.observaciones ? `${credito.observaciones}\n${linea}` : linea;

  const { error: updErr } = await sb
    .from("credito")
    .update({
      cuota_actual: cuotaPagada,
      estado: nuevoEstado,
      // La anteúltima cuota deja la alerta comercial marcada.
      alerta_disparada: nuevoEstado === "por_terminar" ? true : undefined,
      observaciones: nuevasObs,
    })
    .eq("id", creditoId);
  if (updErr) return { error: `No se pudo registrar el pago: ${updErr.message}` };

  revalidatePath("/creditos");
  return { ok: true };
}

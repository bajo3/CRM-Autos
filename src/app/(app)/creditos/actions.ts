"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";

export type FormState = { error?: string; ok?: boolean };

const schema = z.object({
  monto: z.union([z.coerce.number().nonnegative("El monto no puede ser negativo"), z.literal("")])
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  fecha: z.string().optional(),
  observacion: z.string().optional(),
});

type CreditoLite = {
  id: string; empresa_id: string; cantidad_cuotas: number; cuota_actual: number; estado: string;
};

/** Recalcula el estado del crédito según las cuotas pagadas. */
function estadoPorCuotas(cuotasPagadas: number, total: number): "activo" | "por_terminar" | "finalizado" {
  if (cuotasPagadas >= total) return "finalizado";
  if (cuotasPagadas === total - 1) return "por_terminar";
  return "activo";
}

/**
 * Registra el pago de la próxima cuota de un crédito.
 *
 * Inserta una fila en `pago_cuota` (historial estructurado) y, en el mismo
 * flujo, avanza `credito.cuota_actual` y recalcula el estado. El índice único
 * (credito_id, numero_cuota) impide registrar dos veces la misma cuota.
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
  // RLS limita la lectura a la propia empresa: si vuelve fila, es de esta empresa.
  const { data: credito, error: readErr } = await sb
    .from("credito")
    .select("id, empresa_id, cantidad_cuotas, cuota_actual, estado")
    .eq("id", creditoId)
    .maybeSingle<CreditoLite>();
  if (readErr) return { error: `No se pudo leer el crédito: ${readErr.message}` };
  if (!credito) return { error: "Crédito no encontrado." };

  if (credito.estado === "finalizado" || credito.estado === "cancelado") {
    return { error: "El crédito ya está cerrado; no admite más pagos." };
  }
  if (credito.cuota_actual >= credito.cantidad_cuotas) {
    return { error: "Todas las cuotas ya figuran pagadas." };
  }

  const cuotaPagada = credito.cuota_actual + 1;
  const fechaPago = (parsed.data.fecha || "").trim() || new Date().toISOString().slice(0, 10);

  // 1) Insertar el pago. El índice único evita duplicar la misma cuota.
  const { error: insErr } = await sb.from("pago_cuota").insert({
    empresa_id: credito.empresa_id,
    credito_id: credito.id,
    numero_cuota: cuotaPagada,
    monto_pagado: parsed.data.monto ?? 0,
    fecha_pago: fechaPago,
    observaciones: parsed.data.observacion?.trim() || null,
    registrado_por: ctx.userId,
  });
  if (insErr) {
    if (insErr.code === "23505") return { error: `La cuota ${cuotaPagada} ya figura registrada como pagada.` };
    return { error: `No se pudo registrar el pago: ${insErr.message}` };
  }

  // 2) Avanzar el crédito y recalcular el estado.
  const nuevoEstado = estadoPorCuotas(cuotaPagada, credito.cantidad_cuotas);
  const { error: updErr } = await sb
    .from("credito")
    .update({
      cuota_actual: cuotaPagada,
      estado: nuevoEstado,
      alerta_disparada: nuevoEstado === "por_terminar" ? true : undefined,
    })
    .eq("id", credito.id);
  if (updErr) return { error: `Pago guardado, pero no se pudo avanzar el crédito: ${updErr.message}` };

  revalidatePath("/creditos");
  revalidatePath(`/creditos/${credito.id}`);
  return { ok: true };
}

/**
 * Revierte el último pago registrado de un crédito: elimina la fila de
 * `pago_cuota` de la cuota más alta y retrocede `cuota_actual` + estado.
 */
export async function revertirUltimoPago(creditoId: string): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) throw new Error("Sesión inválida.");
  if (!can(ctx.profile.rol, "creditos.cobrar")) throw new Error("Sin permiso para revertir pagos.");

  const sb = createClient();
  const { data: credito } = await sb
    .from("credito")
    .select("id, cantidad_cuotas, cuota_actual, estado")
    .eq("id", creditoId)
    .maybeSingle<{ id: string; cantidad_cuotas: number; cuota_actual: number; estado: string }>();
  if (!credito) throw new Error("Crédito no encontrado.");
  if (credito.estado === "cancelado") throw new Error("El crédito está cancelado.");
  if (credito.cuota_actual <= 0) throw new Error("No hay pagos para revertir.");

  const cuotaAReversar = credito.cuota_actual;

  // Borrar el pago de esa cuota (si existe la fila estructurada).
  const { error: delErr } = await sb
    .from("pago_cuota")
    .delete()
    .eq("credito_id", credito.id)
    .eq("numero_cuota", cuotaAReversar);
  if (delErr) throw new Error(delErr.message);

  const nuevaCuota = credito.cuota_actual - 1;
  const { error: updErr } = await sb
    .from("credito")
    .update({
      cuota_actual: nuevaCuota,
      estado: estadoPorCuotas(nuevaCuota, credito.cantidad_cuotas),
      alerta_disparada: nuevaCuota === credito.cantidad_cuotas - 1,
    })
    .eq("id", credito.id);
  if (updErr) throw new Error(updErr.message);

  revalidatePath("/creditos");
  revalidatePath(`/creditos/${credito.id}`);
}

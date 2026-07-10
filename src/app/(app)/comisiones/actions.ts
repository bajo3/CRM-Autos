"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { businessDateISO } from "@/lib/date";

async function ctxEdicion() {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) throw new Error("Sesión inválida.");
  if (!can(ctx.profile.rol, "margenes.ver")) {
    throw new Error("Sin permiso para gestionar comisiones.");
  }
  return ctx;
}

/** Crea (o reemplaza) la comisión de una venta y calcula el monto. */
export async function crearComision(ventaId: string, formData: FormData): Promise<void> {
  const ctx = await ctxEdicion();
  const sb = createClient();

  const tipo = String(formData.get("tipo") ?? "porcentaje") === "fija" ? "fija" : "porcentaje";
  const valor = Number(formData.get("valor") ?? 0);
  if (!Number.isFinite(valor) || valor < 0) throw new Error("Valor de comisión inválido.");

  const { data: venta } = await sb
    .from("venta")
    .select("precio_final,vendedor_id")
    .eq("id", ventaId)
    .maybeSingle<{ precio_final: number | null; vendedor_id: string | null }>();
  if (!venta) throw new Error("Venta no encontrada.");

  const precio = venta.precio_final ?? 0;
  const calculada = tipo === "porcentaje" ? Math.round((precio * valor) / 100) : Math.round(valor);

  // Una comisión por venta: reemplazamos la anterior si existía.
  await sb.from("comision").delete().eq("venta_id", ventaId);
  const { error } = await sb.from("comision").insert({
    empresa_id: ctx.profile!.empresa_id!,
    venta_id: ventaId,
    vendedor_id: venta.vendedor_id,
    tipo,
    valor,
    comision_calculada: calculada,
    estado: "pendiente",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/comisiones");
}

async function setEstado(comisionId: string, estado: "pendiente" | "pagada" | "cancelada") {
  await ctxEdicion();
  const sb = createClient();
  const patch: { estado: typeof estado; fecha_pago: string | null } = {
    estado,
    fecha_pago: estado === "pagada" ? businessDateISO() : null,
  };
  const { error } = await sb.from("comision").update(patch).eq("id", comisionId);
  if (error) throw new Error(error.message);
  revalidatePath("/comisiones");
}

export async function marcarPagada(comisionId: string): Promise<void> {
  await setEstado(comisionId, "pagada");
}
export async function marcarPendiente(comisionId: string): Promise<void> {
  await setEstado(comisionId, "pendiente");
}

export async function eliminarComision(comisionId: string): Promise<void> {
  await ctxEdicion();
  const sb = createClient();
  const { error } = await sb.from("comision").delete().eq("id", comisionId);
  if (error) throw new Error(error.message);
  revalidatePath("/comisiones");
}

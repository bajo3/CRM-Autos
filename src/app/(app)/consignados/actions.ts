"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";

const uuid = z.union([z.string().uuid(), z.literal("")]).transform((v) => (v === "" ? undefined : v)).optional();
const text = z.union([z.string(), z.literal("")]).transform((v) => (v === "" ? undefined : v)).optional();
const num = z.union([z.coerce.number(), z.literal("")]).transform((v) => (v === "" ? undefined : v)).optional();

const schema = z.object({
  vehiculo_id: z.string().uuid("Elegí el vehículo consignado"),
  dueno_nombre: z.string().min(1, "El nombre del dueño es obligatorio"),
  dueno_contacto: text,
  comision_acordada: num,
  precio_pretendido: num,
  precio_minimo: num,
  vencimiento: text,
  autorizacion_venta: z.union([z.literal("on"), z.literal("")]).transform((v) => v === "on").optional(),
  observaciones: text,
});

export type FormState = { error?: string };

export async function crearConsignacion(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) return { error: "Sesión inválida." };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los campos." };
  const d = parsed.data;

  const sb = createClient();
  const { error } = await sb.from("consignacion").insert({
    empresa_id: ctx.profile.empresa_id,
    vehiculo_id: d.vehiculo_id,
    dueno_nombre: d.dueno_nombre,
    dueno_contacto: d.dueno_contacto,
    comision_acordada: d.comision_acordada,
    precio_pretendido: d.precio_pretendido,
    precio_minimo: d.precio_minimo,
    vencimiento: d.vencimiento,
    autorizacion_venta: d.autorizacion_venta ?? false,
    observaciones: d.observaciones,
    estado: "activa",
  });
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  // El vehículo consignado queda marcado como tal en el stock.
  await sb.from("vehiculo").update({ titularidad: "consignado" }).eq("id", d.vehiculo_id);

  revalidatePath("/consignados");
  revalidatePath("/stock");
  redirect("/consignados");
}

type EstadoConsignacion = "activa" | "vencida" | "vendida" | "retirada";

export async function cambiarEstadoConsignacion(id: string, estado: EstadoConsignacion): Promise<void> {
  const sb = createClient();
  const { error } = await sb.from("consignacion").update({ estado }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/consignados");
}

/** Calcula y registra el monto a rendir al dueño (precio de venta − comisión de la agencia). */
export async function liquidarConsignacion(id: string): Promise<void> {
  const sb = createClient();
  const { data: c } = await sb
    .from("consignacion")
    .select("estado, liquidado, comision_acordada, vehiculo_id")
    .eq("id", id)
    .maybeSingle<{ estado: string; liquidado: boolean; comision_acordada: number | null; vehiculo_id: string | null }>();
  if (!c) throw new Error("Consignación no encontrada.");
  if (c.estado !== "vendida") throw new Error("Solo se puede liquidar una consignación en estado vendida.");
  if (c.liquidado) throw new Error("Esta consignación ya fue liquidada.");
  if (!c.vehiculo_id) throw new Error("La consignación no tiene un vehículo asociado.");

  const { data: venta } = await sb
    .from("venta")
    .select("precio_final")
    .eq("vehiculo_id", c.vehiculo_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ precio_final: number }>();
  if (!venta) throw new Error("No se encontró una venta registrada para este vehículo. Registrala en el módulo Ventas antes de liquidar.");

  const comision = c.comision_acordada ?? 0;
  const montoLiquidado = Math.round(venta.precio_final * (1 - comision / 100));

  const { error } = await sb
    .from("consignacion")
    .update({ liquidado: true, monto_liquidado: montoLiquidado, fecha_liquidacion: new Date().toISOString().slice(0, 10) })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/consignados");
}

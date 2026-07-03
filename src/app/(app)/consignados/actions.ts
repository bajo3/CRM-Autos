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

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
  cliente_id: uuid,
  descripcion: z.string().min(1, "Describí el vehículo a tasar"),
  precio_compra_estimado: num,
  precio_venta_estimado: num,
  gastos_estimados: num,
  observaciones: text,
});

export type FormState = { error?: string };

function calcularMargen(compra?: number, venta?: number, gastos?: number): number | null {
  if (venta == null) return null;
  return venta - (compra ?? 0) - (gastos ?? 0);
}

export async function crearTasacion(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) return { error: "Sesión inválida." };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los campos." };
  const d = parsed.data;

  const sb = createClient();
  const { error } = await sb.from("tasacion").insert({
    empresa_id: ctx.profile.empresa_id,
    cliente_id: d.cliente_id,
    descripcion: d.descripcion,
    precio_compra_estimado: d.precio_compra_estimado,
    precio_venta_estimado: d.precio_venta_estimado,
    gastos_estimados: d.gastos_estimados,
    margen_estimado: calcularMargen(d.precio_compra_estimado, d.precio_venta_estimado, d.gastos_estimados),
    observaciones: d.observaciones,
  });
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/tasaciones");
  redirect("/tasaciones");
}

type DecisionTasacion = "tomar" | "rechazar" | "consultar" | "negociar";

export async function cambiarDecisionTasacion(id: string, decision: DecisionTasacion): Promise<void> {
  const sb = createClient();
  const { error } = await sb.from("tasacion").update({ decision }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/tasaciones");
}

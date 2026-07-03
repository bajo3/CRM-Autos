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
  vehiculo_id: uuid,
  trabajo: z.string().min(1, "Describí el trabajo a realizar"),
  responsable: text,
  taller_externo: text,
  costo_estimado: num,
  fecha_ingreso: text,
  fecha_salida_estimada: text,
});

export type FormState = { error?: string };

export async function crearTrabajoTaller(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) return { error: "Sesión inválida." };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisá los campos." };
  const d = parsed.data;

  const sb = createClient();
  const { error } = await sb.from("taller_trabajo").insert({
    empresa_id: ctx.profile.empresa_id,
    vehiculo_id: d.vehiculo_id,
    trabajo: d.trabajo,
    responsable: d.responsable,
    taller_externo: d.taller_externo,
    costo_estimado: d.costo_estimado,
    fecha_ingreso: d.fecha_ingreso,
    fecha_salida_estimada: d.fecha_salida_estimada,
    estado: "pendiente",
  });
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/taller");
  redirect("/taller");
}

type EstadoTaller = "pendiente" | "en_taller" | "listo_publicar" | "listo_entregar";

export async function cambiarEstadoTaller(id: string, estado: EstadoTaller): Promise<void> {
  const sb = createClient();
  const { error } = await sb.from("taller_trabajo").update({ estado }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/taller");
}

/** Cierra el trabajo (pasa a "listo para publicar") registrando el costo final real. */
export async function cerrarTrabajoTaller(id: string, formData: FormData): Promise<void> {
  const costoFinal = Number(formData.get("costo_final") ?? 0);
  if (!Number.isFinite(costoFinal) || costoFinal < 0) throw new Error("Costo final inválido.");

  const sb = createClient();
  const { error } = await sb.from("taller_trabajo").update({
    costo_final: costoFinal,
    estado: "listo_publicar",
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/taller");
}

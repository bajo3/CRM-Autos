"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";

const num = z.union([z.coerce.number(), z.literal("")]).transform((v) => (v === "" ? undefined : v)).optional();
const uuid = z.union([z.string().uuid(), z.literal("")]).transform((v) => (v === "" ? undefined : v)).optional();

const schema = z.object({
  cliente_id: uuid,
  marca_buscada: z.string().optional(),
  modelo_buscado: z.string().optional(),
  anio_min: num,
  anio_max: num,
  km_max: num,
  presupuesto_max: num,
  combustible: z.enum(["nafta", "diesel", "gnc", "hibrido", "electrico"]).optional().or(z.literal("").transform(() => undefined)),
  urgencia: z.enum(["baja", "media", "alta"]),
  estado: z.enum(["buscando", "unidad_encontrada", "ofrecido", "cerrado", "perdido"]),
  observaciones: z.string().optional(),
});

export type FormState = { error?: string };

export async function crearEncargo(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) return { error: "Sesión inválida." };

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Revisá los campos." };

  const sb = createClient();
  const { error } = await sb.from("encargo").insert({
    ...parsed.data,
    empresa_id: ctx.profile.empresa_id,
    vendedor_id: ctx.profile.id,
  });
  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/encargos");
  redirect("/encargos");
}

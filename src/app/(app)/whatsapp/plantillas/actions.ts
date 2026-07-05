"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { validarVariablesPlantilla } from "@/lib/whatsapp/service";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

const plantillaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(80)
    .regex(/^[a-z0-9_]+$/, "Solo minúsculas, números y guion bajo (así lo exige Meta para plantillas reales)."),
  idioma: z.string().trim().min(1).max(10).default("es_AR"),
  categoria: z.enum(["utility", "marketing", "authentication"]),
  cuerpo: z.string().trim().min(1, "El cuerpo no puede estar vacío.").max(1024),
  estado: z.enum(["aprobada", "pendiente", "rechazada", "desconocido"]),
});

async function ctxConPermiso() {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) throw new Error("Sesión inválida.");
  if (!can(ctx.profile.rol, "whatsapp.plantillas")) throw new Error("Sin permiso para administrar plantillas.");
  return { empresaId: ctx.profile.empresa_id };
}

export async function crearPlantilla(_prev: FormState, formData: FormData): Promise<FormState> {
  const { empresaId } = await ctxConPermiso();

  const parsed = plantillaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Revisá los campos marcados.", fieldErrors };
  }

  const variables = validarVariablesPlantilla(parsed.data.cuerpo);
  if (!variables.ok) return { error: variables.error, fieldErrors: { cuerpo: variables.error } };

  const variablesSchema = Array.from({ length: variables.cantidad }, (_, i) => ({ n: i + 1, descripcion: "" }));

  const sb = createClient();
  const { error } = await sb.from("whatsapp_plantilla").insert({
    empresa_id: empresaId,
    nombre: parsed.data.nombre,
    idioma: parsed.data.idioma,
    categoria: parsed.data.categoria,
    cuerpo: parsed.data.cuerpo,
    variables_schema: variablesSchema,
    estado: parsed.data.estado,
  });
  if (error) {
    if (error.message.includes("duplicate key")) {
      return { error: "Ya existe una plantilla con ese nombre e idioma.", fieldErrors: { nombre: "Nombre duplicado para este idioma." } };
    }
    return { error: error.message };
  }

  revalidatePath("/whatsapp/plantillas");
  return {};
}

export async function eliminarPlantilla(id: string): Promise<void> {
  await ctxConPermiso();
  const sb = createClient();
  const { error } = await sb.from("whatsapp_plantilla").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/whatsapp/plantillas");
}

export async function cambiarEstadoPlantilla(id: string, estado: "aprobada" | "pendiente" | "rechazada" | "desconocido"): Promise<void> {
  await ctxConPermiso();
  const sb = createClient();
  const { error } = await sb.from("whatsapp_plantilla").update({ estado }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/whatsapp/plantillas");
}

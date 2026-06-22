"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";

export type FormState = { error?: string; ok?: boolean; fieldErrors?: Record<string, string> };

const emptyToUndef = <T extends z.ZodTypeAny>(s: T) =>
  z.union([s, z.literal("")]).transform((v) => (v === "" ? undefined : v));

// El último dígito de patente (0-9) mapea al mes de VTV (1-12).
const DIGITOS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

const schema = z.object({
  nombre: z.string().min(1, "El nombre de la agencia es obligatorio"),
  cuit: z.string().optional(),
  telefono: z.string().optional(),
  email: emptyToUndef(z.string().email("Email inválido")).optional(),
  direccion: z.string().optional(),
  localidad: z.string().optional(),
  provincia: z.string().optional(),
  logo_url: emptyToUndef(z.string().url("Debe ser una URL válida")).optional(),
  color_primario: emptyToUndef(
    z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color hex inválido (ej. #1e3a8a)"),
  ).optional(),
});

function fieldErrors(e: z.ZodError) {
  const fe: Record<string, string> = {};
  for (const i of e.issues) fe[String(i.path[0])] = i.message;
  return fe;
}

export async function actualizarEmpresa(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await getSessionContext();
  if (!ctx?.empresa?.id) return { error: "Sesión inválida." };
  if (!can(ctx.profile?.rol, "empresa.configurar")) {
    return { error: "No tenés permiso para editar la empresa." };
  }

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Revisá los campos.", fieldErrors: fieldErrors(parsed.error) };

  // vtv_calendario: 10 inputs (uno por dígito), cada uno mes 1-12.
  const vtv: Record<string, number> = {};
  for (const d of DIGITOS) {
    const raw = String(formData.get(`vtv_${d}`) ?? "").trim();
    if (raw === "") continue;
    const mes = Number(raw);
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      return { error: `Mes de VTV inválido para el dígito ${d} (debe ser 1-12).` };
    }
    vtv[d] = mes;
  }

  const sb = createClient();
  // RLS vuelve a chequear que solo el dueño de esta empresa pueda actualizar.
  const { error } = await sb
    .from("empresa")
    .update({
      nombre: parsed.data.nombre,
      cuit: parsed.data.cuit ?? null,
      telefono: parsed.data.telefono ?? null,
      email: parsed.data.email ?? null,
      direccion: parsed.data.direccion ?? null,
      localidad: parsed.data.localidad ?? null,
      provincia: parsed.data.provincia ?? null,
      logo_url: parsed.data.logo_url ?? null,
      color_primario: parsed.data.color_primario ?? null,
      ...(Object.keys(vtv).length === 10 ? { vtv_calendario: vtv } : {}),
    })
    .eq("id", ctx.empresa.id);

  if (error) return { error: `No se pudo guardar: ${error.message}` };

  revalidatePath("/configuracion");
  return { ok: true };
}

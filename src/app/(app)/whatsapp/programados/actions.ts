"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { normalizarTelefonoAr } from "@/lib/whatsapp/telefono";
import type { Database } from "@/lib/types/database.types";
import { getWhatsappAccountStatus } from "@/lib/whatsapp/account-status";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

type ProgramadoInsert = Database["public"]["Tables"]["whatsapp_programado"]["Insert"];

const MOTIVOS = ["seguimiento", "cuota", "postventa", "vtv", "service", "renovacion", "promo", "otro"] as const;

const baseSchema = z.object({
  cliente_id: z.string().uuid("Elegí un cliente."),
  fecha: z.string().min(1, "Elegí una fecha."),
  hora: z.string().min(1, "Elegí una hora."),
  motivo: z.enum(MOTIVOS),
  tipo_contenido: z.enum(["plantilla", "texto"]),
  plantilla_id: z.string().optional(),
  variables: z.string().optional(),
  cuerpo_texto: z.string().optional(),
});

async function ctxConPermiso() {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) throw new Error("Sesión inválida.");
  if (!can(ctx.profile.rol, "whatsapp.programados")) throw new Error("Sin permiso para programar mensajes.");
  return { empresaId: ctx.profile.empresa_id, userId: ctx.userId };
}

export async function crearProgramadoManual(_prev: FormState, formData: FormData): Promise<FormState> {
  const { empresaId, userId } = await ctxConPermiso();
  const account = await getWhatsappAccountStatus(empresaId);
  if (!account.connected) {
    return { error: "Conectá WhatsApp antes de programar mensajes. No se guardó ningún envío." };
  }

  const parsed = baseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Revisá los campos marcados.", fieldErrors };
  }
  const d = parsed.data;

  const sb = createClient();
  const { data: cliente } = await sb
    .from("cliente")
    .select("telefono, whatsapp")
    .eq("id", d.cliente_id)
    .eq("empresa_id", empresaId)
    .maybeSingle();
  const telefonoOriginal = cliente?.whatsapp || cliente?.telefono;
  if (!telefonoOriginal) return { error: "El cliente elegido no tiene teléfono cargado." };
  const telefono = normalizarTelefonoAr(telefonoOriginal);

  const sendAt = new Date(`${d.fecha}T${d.hora}:00`);
  if (Number.isNaN(sendAt.getTime())) return { error: "Fecha u hora inválida." };
  if (sendAt.getTime() <= Date.now()) return { error: "La fecha y hora deben estar en el futuro." };

  const insert: ProgramadoInsert = {
    empresa_id: empresaId,
    cliente_id: d.cliente_id,
    telefono,
    send_at: sendAt.toISOString(),
    motivo: d.motivo,
    creado_por: userId,
  };

  if (d.tipo_contenido === "plantilla") {
    if (!d.plantilla_id) return { error: "Elegí una plantilla.", fieldErrors: { plantilla_id: "Obligatoria." } };
    const { data: plantilla } = await sb
      .from("whatsapp_plantilla")
      .select("nombre, idioma")
      .eq("id", d.plantilla_id)
      .eq("empresa_id", empresaId)
      .maybeSingle();
    if (!plantilla) return { error: "Plantilla no encontrada." };
    insert.plantilla_id = d.plantilla_id;
    insert.plantilla_nombre = plantilla.nombre;
    insert.idioma = plantilla.idioma;
    insert.variables = (d.variables ?? "").split(",").map((v) => v.trim()).filter(Boolean);
  } else {
    const cuerpo = (d.cuerpo_texto ?? "").trim();
    if (!cuerpo) return { error: "El texto no puede estar vacío.", fieldErrors: { cuerpo_texto: "Obligatorio." } };
    insert.cuerpo_texto = cuerpo;
  }

  const { error } = await sb.from("whatsapp_programado").insert(insert);
  if (error) return { error: error.message };

  revalidatePath("/whatsapp/programados");
  return {};
}

export async function cancelarProgramado(id: string): Promise<void> {
  const { empresaId } = await ctxConPermiso();
  const sb = createClient();
  const { error } = await sb
    .from("whatsapp_programado")
    .update({ estado: "cancelado" })
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .eq("estado", "pendiente");
  if (error) throw new Error(error.message);
  revalidatePath("/whatsapp/programados");
}

export async function reintentarProgramado(id: string): Promise<void> {
  const { empresaId } = await ctxConPermiso();
  const account = await getWhatsappAccountStatus(empresaId);
  if (!account.connected) throw new Error("Conectá WhatsApp antes de reintentar el envío.");

  const sb = createClient();
  const { error } = await sb.from("whatsapp_programado")
    .update({
      estado: "pendiente",
      intentos_restantes: 3,
      error_mensaje: null,
      send_at: new Date(Date.now() + 60_000).toISOString(),
    })
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .eq("estado", "fallado");
  if (error) throw new Error(error.message);
  revalidatePath("/whatsapp/programados");
}

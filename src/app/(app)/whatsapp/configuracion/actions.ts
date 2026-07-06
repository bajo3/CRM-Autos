"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { registrarEventoWa } from "@/lib/whatsapp/log";
import { encryptToken } from "@/lib/whatsapp/crypto";
import { testearConexionMeta, intercambiarCodigoOAuth } from "@/lib/whatsapp/meta";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

async function ctxConPermisoConexion() {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) throw new Error("Sesión inválida.");
  if (!can(ctx.profile.rol, "whatsapp.conectar")) throw new Error("Sin permiso para administrar la conexión de WhatsApp.");
  return { empresaId: ctx.profile.empresa_id, userId: ctx.userId, email: ctx.email };
}

const manualSchema = z.object({
  waba_id: z.string().trim().min(1, "Obligatorio."),
  phone_number_id: z.string().trim().min(1, "Obligatorio."),
  access_token: z.string().trim().min(1, "Obligatorio."),
  business_id: z.string().trim().optional(),
});

export async function conectarWhatsappManual(_prev: FormState, formData: FormData): Promise<FormState> {
  const { empresaId, userId, email } = await ctxConPermisoConexion();

  const parsed = manualSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Revisá los campos marcados.", fieldErrors };
  }
  const d = parsed.data;

  const test = await testearConexionMeta(d.phone_number_id, d.access_token);
  const sb = createClient();

  if (!test.ok) {
    await sb.from("whatsapp_account").upsert(
      {
        empresa_id: empresaId,
        waba_id: d.waba_id,
        phone_number_id: d.phone_number_id,
        business_id: d.business_id || null,
        estado: "error",
        last_error: test.error,
      },
      { onConflict: "empresa_id" },
    );
    await registrarEventoWa(sb, { empresaId, tipo: "webhook_error", detalle: `Falló la prueba de conexión manual: ${test.error}`, usuarioId: userId });
    revalidatePath("/whatsapp/configuracion");
    return { error: `No se pudo validar contra Meta: ${test.error}` };
  }

  const { error } = await sb.from("whatsapp_account").upsert(
    {
      empresa_id: empresaId,
      waba_id: d.waba_id,
      phone_number_id: d.phone_number_id,
      business_id: d.business_id || null,
      display_phone_number: test.displayPhoneNumber,
      access_token_encrypted: encryptToken(d.access_token),
      estado: "conectado",
      conectado_por: userId,
      conectado_at: new Date().toISOString(),
      last_error: null,
    },
    { onConflict: "empresa_id" },
  );
  if (error) return { error: error.message };

  await registrarEventoWa(sb, {
    empresaId,
    tipo: "conexion",
    detalle: `WhatsApp conectado manualmente por ${email ?? "un usuario"} (${test.displayPhoneNumber}).`,
    usuarioId: userId,
  });

  revalidatePath("/whatsapp/configuracion");
  return {};
}

export async function desconectarWhatsapp(): Promise<void> {
  const { empresaId, userId, email } = await ctxConPermisoConexion();
  const sb = createClient();
  const { error } = await sb
    .from("whatsapp_account")
    .update({ estado: "desconectado", access_token_encrypted: null, last_error: null })
    .eq("empresa_id", empresaId);
  if (error) throw new Error(error.message);

  await registrarEventoWa(sb, {
    empresaId,
    tipo: "desconexion",
    detalle: `WhatsApp desconectado por ${email ?? "un usuario"}.`,
    usuarioId: userId,
  });
  revalidatePath("/whatsapp/configuracion");
}

/**
 * Finaliza el flujo Embedded Signup: intercambia el `code` que devuelve el SDK
 * de Meta por un access token, y guarda la cuenta con los datos que el propio
 * flujo entrega por postMessage (waba_id, phone_number_id, business_id).
 */
export async function completarEmbeddedSignup(params: {
  code: string;
  wabaId: string;
  phoneNumberId: string;
  businessId: string | null;
  fbUserId: string | null;
}): Promise<{ error?: string }> {
  const { empresaId, userId, email } = await ctxConPermisoConexion();

  const intercambio = await intercambiarCodigoOAuth(params.code);
  if (!intercambio.ok) return { error: intercambio.error };

  const test = await testearConexionMeta(params.phoneNumberId, intercambio.accessToken);
  const sb = createClient();

  if (!test.ok) {
    await sb.from("whatsapp_account").upsert(
      {
        empresa_id: empresaId,
        waba_id: params.wabaId,
        phone_number_id: params.phoneNumberId,
        business_id: params.businessId,
        fb_user_id: params.fbUserId,
        estado: "error",
        last_error: test.error,
      },
      { onConflict: "empresa_id" },
    );
    return { error: test.error };
  }

  const { error } = await sb.from("whatsapp_account").upsert(
    {
      empresa_id: empresaId,
      waba_id: params.wabaId,
      phone_number_id: params.phoneNumberId,
      business_id: params.businessId,
      fb_user_id: params.fbUserId,
      display_phone_number: test.displayPhoneNumber,
      access_token_encrypted: encryptToken(intercambio.accessToken),
      estado: "conectado",
      conectado_por: userId,
      conectado_at: new Date().toISOString(),
      last_error: null,
    },
    { onConflict: "empresa_id" },
  );
  if (error) return { error: error.message };

  await registrarEventoWa(sb, {
    empresaId,
    tipo: "conexion",
    detalle: `WhatsApp conectado por Embedded Signup por ${email ?? "un usuario"} (${test.displayPhoneNumber}).`,
    usuarioId: userId,
  });
  revalidatePath("/whatsapp/configuracion");
  return {};
}

const configSchema = z.object({
  habilitado: z.coerce.boolean().default(false),
  nombre_comercial: z.string().trim().max(120).optional(),
  direccion: z.string().trim().max(200).optional(),
  horarios: z.string().trim().max(300).optional(),
  financiacion: z.string().trim().max(500).optional(),
  politica_permuta: z.string().trim().max(500).optional(),
  mensaje_fallback: z.string().trim().min(1, "El mensaje de derivación no puede estar vacío.").max(300),
  keywords_handoff: z.string().trim().max(300).optional(),
  tono: z.enum(["profesional", "cercano", "breve"]),
  pausa_intervencion_min: z.coerce.number().int().min(0).max(1440),
});

export async function guardarBotConfig(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) return { error: "Sesión inválida." };
  if (!can(ctx.profile.rol, "whatsapp.bot")) return { error: "Sin permiso para editar la configuración del bot." };

  const raw = Object.fromEntries(formData);
  const parsed = configSchema.safeParse({ ...raw, habilitado: formData.get("habilitado") === "on" });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Revisá los campos marcados.", fieldErrors };
  }

  const keywords = (parsed.data.keywords_handoff ?? "")
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  const sb = createClient();
  const { error } = await sb
    .from("whatsapp_bot_config")
    .upsert(
      {
        empresa_id: ctx.profile.empresa_id,
        habilitado: parsed.data.habilitado,
        nombre_comercial: parsed.data.nombre_comercial || null,
        direccion: parsed.data.direccion || null,
        horarios: parsed.data.horarios || null,
        financiacion: parsed.data.financiacion || null,
        politica_permuta: parsed.data.politica_permuta || null,
        mensaje_fallback: parsed.data.mensaje_fallback,
        keywords_handoff: keywords.length > 0 ? keywords : ["humano", "asesor", "vendedor", "persona"],
        tono: parsed.data.tono,
        pausa_intervencion_min: parsed.data.pausa_intervencion_min,
      },
      { onConflict: "empresa_id" },
    );
  if (error) return { error: error.message };

  await registrarEventoWa(sb, {
    empresaId: ctx.profile.empresa_id,
    tipo: parsed.data.habilitado ? "bot_activado" : "bot_pausado",
    detalle: `Configuración del bot actualizada por ${ctx.email ?? "un usuario"}.`,
    usuarioId: ctx.userId,
  });

  revalidatePath("/whatsapp/configuracion");
  return {};
}

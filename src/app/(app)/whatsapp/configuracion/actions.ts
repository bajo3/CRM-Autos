"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { registrarEventoWa } from "@/lib/whatsapp/log";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

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

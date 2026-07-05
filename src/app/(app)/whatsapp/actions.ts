"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { sendTextMessage, sendTemplateMessage } from "@/lib/whatsapp/service";
import { registrarEventoWa } from "@/lib/whatsapp/log";

async function ctxConPermiso(permiso: Parameters<typeof can>[1]) {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) throw new Error("Sesión inválida.");
  if (!can(ctx.profile.rol, permiso)) throw new Error("Sin permiso.");
  return { userId: ctx.userId, empresaId: ctx.profile.empresa_id };
}

async function pausarBotPorIntervencion(
  sb: ReturnType<typeof createClient>,
  empresaId: string,
  conversacionId: string,
) {
  const { data: config } = await sb
    .from("whatsapp_bot_config")
    .select("pausa_intervencion_min")
    .eq("empresa_id", empresaId)
    .maybeSingle();
  const minutos = config?.pausa_intervencion_min ?? 240;
  const hasta = new Date(Date.now() + minutos * 60_000).toISOString();
  await sb
    .from("whatsapp_conversacion")
    .update({ bot_pausado_hasta: hasta })
    .eq("id", conversacionId);
}

export async function enviarMensajeManual(
  conversacionId: string,
  telefono: string,
  texto: string,
): Promise<{ error?: string }> {
  const { userId, empresaId } = await ctxConPermiso("whatsapp.enviar");
  if (!texto.trim()) return { error: "El mensaje no puede estar vacío." };

  const sb = createClient();
  const resultado = await sendTextMessage(sb, {
    empresaId: empresaId,
    telefono,
    cuerpo: texto.trim(),
    enviadoPor: userId,
  });

  if (resultado.ok) {
    await pausarBotPorIntervencion(sb, empresaId, conversacionId);
    await registrarEventoWa(sb, {
      empresaId: empresaId,
      tipo: "bot_pausado",
      detalle: "Bot pausado por intervención manual de un vendedor.",
      usuarioId: userId,
    });
  }

  revalidatePath("/whatsapp");
  revalidatePath(`/whatsapp/${conversacionId}`);
  return resultado.ok ? {} : { error: resultado.error };
}

export async function enviarPlantillaManual(
  conversacionId: string,
  telefono: string,
  plantillaId: string,
  variables: string[],
): Promise<{ error?: string }> {
  const { userId, empresaId } = await ctxConPermiso("whatsapp.enviar");
  const sb = createClient();

  const { data: plantilla } = await sb
    .from("whatsapp_plantilla")
    .select("nombre, idioma, cuerpo")
    .eq("id", plantillaId)
    .single();
  if (!plantilla) return { error: "Plantilla no encontrada." };

  const resultado = await sendTemplateMessage(sb, {
    empresaId: empresaId,
    telefono,
    nombrePlantilla: plantilla.nombre,
    idioma: plantilla.idioma,
    variables,
    cuerpoLocal: plantilla.cuerpo,
    enviadoPor: userId,
  });

  revalidatePath("/whatsapp");
  revalidatePath(`/whatsapp/${conversacionId}`);
  return resultado.ok ? {} : { error: resultado.error };
}

export async function marcarConversacionLeida(conversacionId: string): Promise<void> {
  const ctx = await getSessionContext();
  if (!ctx?.profile?.empresa_id) return;
  const sb = createClient();
  await sb
    .from("whatsapp_conversacion")
    .update({ no_leidos: 0 })
    .eq("id", conversacionId)
    .eq("empresa_id", ctx.profile.empresa_id);
}

export async function asignarConversacion(conversacionId: string, vendedorId: string | null): Promise<void> {
  await ctxConPermiso("whatsapp.enviar");
  const sb = createClient();
  const { error } = await sb
    .from("whatsapp_conversacion")
    .update({ asignado_a: vendedorId })
    .eq("id", conversacionId);
  if (error) throw new Error(error.message);
  revalidatePath("/whatsapp");
  revalidatePath(`/whatsapp/${conversacionId}`);
}

export async function cambiarEstadoConversacion(
  conversacionId: string,
  estado: "abierta" | "pendiente" | "cerrada",
): Promise<void> {
  await ctxConPermiso("whatsapp.enviar");
  const sb = createClient();
  const { error } = await sb
    .from("whatsapp_conversacion")
    .update({ estado })
    .eq("id", conversacionId);
  if (error) throw new Error(error.message);

  if (estado === "cerrada") {
    await agregarNotaResumenSiCorresponde(sb, conversacionId);
  }

  revalidatePath("/whatsapp");
  revalidatePath(`/whatsapp/${conversacionId}`);
}

async function agregarNotaResumenSiCorresponde(
  sb: ReturnType<typeof createClient>,
  conversacionId: string,
) {
  const { data: conv } = await sb
    .from("whatsapp_conversacion")
    .select("cliente_id, telefono")
    .eq("id", conversacionId)
    .single();
  if (!conv?.cliente_id) return;

  const { data: huboBot } = await sb
    .from("whatsapp_mensaje")
    .select("id")
    .eq("conversacion_id", conversacionId)
    .eq("enviado_por_bot", true)
    .limit(1);
  if (!huboBot || huboBot.length === 0) return;

  const { data: cliente } = await sb
    .from("cliente")
    .select("observaciones")
    .eq("id", conv.cliente_id)
    .single();
  const nota = `[WhatsApp ${new Date().toLocaleDateString("es-AR")}] Conversación cerrada, el bot participó en la atención inicial.`;
  const observaciones = cliente?.observaciones ? `${cliente.observaciones}\n${nota}` : nota;
  await sb.from("cliente").update({ observaciones }).eq("id", conv.cliente_id);
}

export async function pausarBotConversacion(conversacionId: string, horas: number): Promise<void> {
  await ctxConPermiso("whatsapp.enviar");
  const sb = createClient();
  const hasta = new Date(Date.now() + horas * 3_600_000).toISOString();
  const { error } = await sb
    .from("whatsapp_conversacion")
    .update({ bot_pausado_hasta: hasta })
    .eq("id", conversacionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/whatsapp/${conversacionId}`);
}

export async function reactivarBotConversacion(conversacionId: string): Promise<void> {
  await ctxConPermiso("whatsapp.enviar");
  const sb = createClient();
  const { error } = await sb
    .from("whatsapp_conversacion")
    .update({ bot_pausado_hasta: null, bot_activo: true })
    .eq("id", conversacionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/whatsapp/${conversacionId}`);
}

export async function crearClienteDesdeConversacion(conversacionId: string, nombre: string): Promise<void> {
  const { userId, empresaId } = await ctxConPermiso("whatsapp.enviar");
  const sb = createClient();

  const { data: conv } = await sb
    .from("whatsapp_conversacion")
    .select("telefono, cliente_id")
    .eq("id", conversacionId)
    .single();
  if (!conv || conv.cliente_id) return;

  const { data: nuevo, error } = await sb
    .from("cliente")
    .insert({
      empresa_id: empresaId,
      nombre: nombre.trim() || `WhatsApp ${conv.telefono.slice(-4)}`,
      telefono: conv.telefono,
      whatsapp: conv.telefono,
      origen: "whatsapp",
      estado: "nuevo",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await sb.from("whatsapp_conversacion").update({ cliente_id: nuevo.id }).eq("id", conversacionId);
  revalidatePath(`/whatsapp/${conversacionId}`);
}

export async function crearSeguimientoDesdeConversacion(
  conversacionId: string,
  formData: FormData,
): Promise<void> {
  const { userId, empresaId } = await ctxConPermiso("whatsapp.enviar");
  const sb = createClient();

  const { data: conv } = await sb
    .from("whatsapp_conversacion")
    .select("cliente_id")
    .eq("id", conversacionId)
    .single();
  if (!conv?.cliente_id) throw new Error("La conversación no tiene un cliente asociado.");

  const fecha = String(formData.get("fecha") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!fecha) throw new Error("Elegí una fecha.");

  const { error } = await sb.from("seguimiento").insert({
    empresa_id: empresaId,
    cliente_id: conv.cliente_id,
    vendedor_id: userId,
    fecha,
    motivo: motivo || "Seguimiento desde WhatsApp",
    estado: "pendiente",
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/whatsapp/${conversacionId}`);
  revalidatePath("/seguimientos");
}

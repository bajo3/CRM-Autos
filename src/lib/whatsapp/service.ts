import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { decryptToken } from "./crypto";
import { metaPost, envioSimulado, WhatsAppApiError } from "./meta";
import { bridgePost } from "./bridge";
import { registrarEventoWa } from "./log";

/**
 * Servicio de WhatsApp: cuenta por empresa, envío de mensajes (texto y plantilla),
 * ventana de 24 h y persistencia de salientes. Las funciones reciben el cliente
 * Supabase del contexto (con sesión → RLS, o admin → webhook/worker).
 */

type Db = SupabaseClient<Database>;
type Cuenta = Database["public"]["Tables"]["whatsapp_account"]["Row"];
type Conversacion = Database["public"]["Tables"]["whatsapp_conversacion"]["Row"];

const VENTANA_MS = 24 * 60 * 60 * 1000;
const PREVIEW_MAX = 80;

export function preview(texto: string | null | undefined): string | null {
  if (!texto) return null;
  return texto.length > PREVIEW_MAX ? `${texto.slice(0, PREVIEW_MAX - 1)}…` : texto;
}

/** ¿La conversación tiene la ventana de atención de 24 h abierta? */
export function dentroVentana24h(
  ultimaEntradaAt: string | null,
  ahora: Date = new Date(),
): boolean {
  if (!ultimaEntradaAt) return false;
  return ahora.getTime() - new Date(ultimaEntradaAt).getTime() < VENTANA_MS;
}

/** ¿El bot debe responder en esta conversación en este momento? */
export function botEfectivo(
  activo: boolean,
  pausadoHasta: string | null,
  ahora: Date = new Date(),
): boolean {
  if (!activo) return false;
  if (!pausadoHasta) return true;
  return new Date(pausadoHasta).getTime() < ahora.getTime();
}

export async function getAccountForEmpresa(sb: Db, empresaId: string): Promise<Cuenta | null> {
  const { data } = await sb
    .from("whatsapp_account")
    .select("*")
    .eq("empresa_id", empresaId)
    .maybeSingle();
  return data;
}

export async function getAccountByPhoneNumberId(sb: Db, phoneNumberId: string): Promise<Cuenta | null> {
  const { data } = await sb
    .from("whatsapp_account")
    .select("*")
    .eq("phone_number_id", phoneNumberId)
    .maybeSingle();
  return data;
}

function cuentaLista(cuenta: Cuenta | null): asserts cuenta is Cuenta {
  if (!cuenta || cuenta.estado !== "conectado" || !cuenta.phone_number_id) {
    throw new Error("La empresa no tiene una cuenta de WhatsApp conectada.");
  }
}

function tokenDeCuenta(cuenta: Cuenta): string {
  if (envioSimulado()) return "FAKE_TOKEN";
  if (!cuenta.access_token_encrypted) {
    throw new Error("La cuenta de WhatsApp no tiene token guardado.");
  }
  return decryptToken(cuenta.access_token_encrypted);
}

/**
 * Punto único de envío: elige transporte según `cuenta.provider` sin bifurcar
 * el resto del pipeline (persistencia, ventana 24h, logs son iguales para ambos).
 * 'meta' exige token descifrado; 'baileys' habla con el bridge por empresa_id.
 */
async function enviarPorCuenta(
  cuenta: Cuenta,
  empresaId: string,
  payload: Record<string, unknown>,
): Promise<{ messages?: { id: string }[]; [k: string]: unknown }> {
  if (cuenta.provider === "baileys") {
    return bridgePost(empresaId, payload);
  }
  return metaPost(cuenta.phone_number_id!, tokenDeCuenta(cuenta), payload);
}

/** Busca o crea la conversación de una empresa con un teléfono (E.164 sin +). */
export async function obtenerOCrearConversacion(
  sb: Db,
  params: {
    empresaId: string;
    telefono: string;
    accountId?: string | null;
    nombreContacto?: string | null;
  },
): Promise<Conversacion> {
  const { data: existente } = await sb
    .from("whatsapp_conversacion")
    .select("*")
    .eq("empresa_id", params.empresaId)
    .eq("telefono", params.telefono)
    .maybeSingle();
  if (existente) return existente;

  const { data: creada, error } = await sb
    .from("whatsapp_conversacion")
    .insert({
      empresa_id: params.empresaId,
      telefono: params.telefono,
      account_id: params.accountId ?? null,
      nombre_contacto: params.nombreContacto ?? null,
    })
    .select("*")
    .single();
  if (error) {
    // Carrera con otro insert (webhook concurrente): reintentar lectura.
    const { data: retry } = await sb
      .from("whatsapp_conversacion")
      .select("*")
      .eq("empresa_id", params.empresaId)
      .eq("telefono", params.telefono)
      .maybeSingle();
    if (retry) return retry;
    throw new Error(`No se pudo crear la conversación: ${error.message}`);
  }
  return creada;
}

type ResultadoEnvio =
  | { ok: true; mensajeId: string; waMessageId: string }
  | { ok: false; error: string };

async function persistirSaliente(
  sb: Db,
  params: {
    empresaId: string;
    conversacionId: string;
    tipo: Database["public"]["Enums"]["tipo_wa_mensaje"];
    cuerpo: string;
    waMessageId: string | null;
    estado: Database["public"]["Enums"]["estado_wa_mensaje"];
    errorMensaje?: string | null;
    rawPayload?: unknown;
    enviadoPor?: string | null;
    enviadoPorBot?: boolean;
  },
): Promise<string> {
  const { data, error } = await sb
    .from("whatsapp_mensaje")
    .insert({
      empresa_id: params.empresaId,
      conversacion_id: params.conversacionId,
      direccion: "saliente",
      tipo: params.tipo,
      cuerpo: params.cuerpo,
      wa_message_id: params.waMessageId,
      estado: params.estado,
      error_mensaje: params.errorMensaje ?? null,
      raw_payload: (params.rawPayload ?? null) as never,
      enviado_por: params.enviadoPor ?? null,
      enviado_por_bot: params.enviadoPorBot ?? false,
    })
    .select("id")
    .single();
  if (error) throw new Error(`No se pudo guardar el mensaje saliente: ${error.message}`);

  await sb
    .from("whatsapp_conversacion")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: preview(params.cuerpo),
    })
    .eq("id", params.conversacionId);

  return data.id;
}

/** Envía texto libre. Solo válido dentro de la ventana de 24 h. */
export async function sendTextMessage(
  sb: Db,
  params: {
    empresaId: string;
    telefono: string;
    cuerpo: string;
    enviadoPor?: string | null;
    enviadoPorBot?: boolean;
  },
): Promise<ResultadoEnvio> {
  const cuenta = await getAccountForEmpresa(sb, params.empresaId);
  cuentaLista(cuenta);

  const conv = await obtenerOCrearConversacion(sb, {
    empresaId: params.empresaId,
    telefono: params.telefono,
    accountId: cuenta.id,
  });

  if (!dentroVentana24h(conv.ultima_entrada_at)) {
    return {
      ok: false,
      error:
        "La ventana de 24 h está cerrada: WhatsApp solo permite plantillas aprobadas hasta que el cliente vuelva a escribir.",
    };
  }

  try {
    const resp = await enviarPorCuenta(cuenta, params.empresaId, {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: params.telefono,
      type: "text",
      text: { body: params.cuerpo },
    });
    const waId = resp.messages?.[0]?.id ?? null;
    const mensajeId = await persistirSaliente(sb, {
      empresaId: params.empresaId,
      conversacionId: conv.id,
      tipo: "texto",
      cuerpo: params.cuerpo,
      waMessageId: waId,
      estado: "enviado",
      rawPayload: resp,
      enviadoPor: params.enviadoPor,
      enviadoPorBot: params.enviadoPorBot,
    });
    await registrarEventoWa(sb, {
      empresaId: params.empresaId,
      tipo: "mensaje_enviado",
      detalle: `Texto a ${params.telefono}`,
      usuarioId: params.enviadoPor ?? null,
    });
    return { ok: true, mensajeId, waMessageId: waId ?? "" };
  } catch (err) {
    const msg = err instanceof WhatsAppApiError ? err.message : "Error al enviar el mensaje.";
    await persistirSaliente(sb, {
      empresaId: params.empresaId,
      conversacionId: conv.id,
      tipo: "texto",
      cuerpo: params.cuerpo,
      waMessageId: null,
      estado: "fallado",
      errorMensaje: msg,
      rawPayload: err instanceof WhatsAppApiError ? err.detalle : null,
      enviadoPor: params.enviadoPor,
      enviadoPorBot: params.enviadoPorBot,
    });
    await registrarEventoWa(sb, {
      empresaId: params.empresaId,
      tipo: "mensaje_fallado",
      detalle: msg,
      usuarioId: params.enviadoPor ?? null,
    });
    return { ok: false, error: msg };
  }
}

/** Renderiza el cuerpo local de una plantilla con variables posicionales {{1}}, {{2}}… */
export function renderPlantilla(cuerpo: string, variables: string[]): string {
  return cuerpo.replace(/\{\{(\d+)\}\}/g, (_, n: string) => {
    const idx = parseInt(n, 10) - 1;
    return variables[idx] ?? `{{${n}}}`;
  });
}

/**
 * Valida que las variables {{n}} de una plantilla sean secuenciales desde 1
 * sin saltos (Meta exige esto para plantillas reales). Devuelve la cantidad
 * de variables detectadas.
 */
export function validarVariablesPlantilla(cuerpo: string): { ok: true; cantidad: number } | { ok: false; error: string } {
  const matches = [...cuerpo.matchAll(/\{\{(\d+)\}\}/g)].map((m) => parseInt(m[1], 10));
  if (matches.length === 0) return { ok: true, cantidad: 0 };
  const unicos = Array.from(new Set(matches)).sort((a, b) => a - b);
  for (let i = 0; i < unicos.length; i++) {
    if (unicos[i] !== i + 1) {
      return { ok: false, error: `Las variables deben ser secuenciales desde {{1}} sin saltos (falta {{${i + 1}}}).` };
    }
  }
  return { ok: true, cantidad: unicos.length };
}

/** Envía una plantilla aprobada (válido también fuera de la ventana de 24 h). */
export async function sendTemplateMessage(
  sb: Db,
  params: {
    empresaId: string;
    telefono: string;
    nombrePlantilla: string;
    idioma: string;
    variables: string[];
    /** Cuerpo local de la plantilla para guardar el texto renderizado en el historial. */
    cuerpoLocal?: string | null;
    enviadoPor?: string | null;
    enviadoPorBot?: boolean;
  },
): Promise<ResultadoEnvio> {
  const cuenta = await getAccountForEmpresa(sb, params.empresaId);
  cuentaLista(cuenta);

  const conv = await obtenerOCrearConversacion(sb, {
    empresaId: params.empresaId,
    telefono: params.telefono,
    accountId: cuenta.id,
  });

  const cuerpoHistorial = params.cuerpoLocal
    ? renderPlantilla(params.cuerpoLocal, params.variables)
    : `[Plantilla ${params.nombrePlantilla}]`;

  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: params.telefono,
    type: "template",
    template: {
      name: params.nombrePlantilla,
      language: { code: params.idioma },
      ...(params.variables.length > 0 && {
        components: [
          {
            type: "body",
            parameters: params.variables.map((v) => ({ type: "text", text: v })),
          },
        ],
      }),
    },
  };

  try {
    const resp = await enviarPorCuenta(cuenta, params.empresaId, payload);
    const waId = resp.messages?.[0]?.id ?? null;
    const mensajeId = await persistirSaliente(sb, {
      empresaId: params.empresaId,
      conversacionId: conv.id,
      tipo: "plantilla",
      cuerpo: cuerpoHistorial,
      waMessageId: waId,
      estado: "enviado",
      rawPayload: resp,
      enviadoPor: params.enviadoPor,
      enviadoPorBot: params.enviadoPorBot,
    });
    await registrarEventoWa(sb, {
      empresaId: params.empresaId,
      tipo: "mensaje_enviado",
      detalle: `Plantilla ${params.nombrePlantilla} a ${params.telefono}`,
      usuarioId: params.enviadoPor ?? null,
    });
    return { ok: true, mensajeId, waMessageId: waId ?? "" };
  } catch (err) {
    const msg = err instanceof WhatsAppApiError ? err.message : "Error al enviar la plantilla.";
    await persistirSaliente(sb, {
      empresaId: params.empresaId,
      conversacionId: conv.id,
      tipo: "plantilla",
      cuerpo: cuerpoHistorial,
      waMessageId: null,
      estado: "fallado",
      errorMensaje: msg,
      rawPayload: err instanceof WhatsAppApiError ? err.detalle : null,
      enviadoPor: params.enviadoPor,
      enviadoPorBot: params.enviadoPorBot,
    });
    await registrarEventoWa(sb, {
      empresaId: params.empresaId,
      tipo: "mensaje_fallado",
      detalle: msg,
      usuarioId: params.enviadoPor ?? null,
    });
    return { ok: false, error: msg };
  }
}

/** Marca como leído un mensaje entrante en WhatsApp (doble tilde azul). */
export async function markMessageAsRead(
  sb: Db,
  params: { empresaId: string; waMessageId: string },
): Promise<void> {
  const cuenta = await getAccountForEmpresa(sb, params.empresaId);
  if (!cuenta || cuenta.estado !== "conectado" || !cuenta.phone_number_id) return;
  if (cuenta.provider === "baileys") return; // el bridge (beta) no expone read receipts vía HTTP
  if (envioSimulado()) return;
  try {
    await metaPost(cuenta.phone_number_id, tokenDeCuenta(cuenta), {
      messaging_product: "whatsapp",
      status: "read",
      message_id: params.waMessageId,
    });
  } catch {
    // No crítico: el read receipt puede fallar sin afectar el flujo.
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { coincideTelefono, soloDigitos } from "./telefono";
import { obtenerOCrearConversacion, preview, getAccountByPhoneNumberId } from "./service";
import { registrarEventoWa } from "./log";
import type { MensajeEntrante, EstadoSaliente } from "./webhook-parser";

/**
 * Procesamiento de eventos entrantes del webhook (corre con el cliente admin:
 * cada query filtra empresa_id explícitamente).
 * - Guarda el mensaje (idempotente por wa_message_id).
 * - Crea/asocia la conversación y el cliente/lead por teléfono.
 * - Detecta vehículo de interés mencionado en el texto contra el stock real.
 */

type Db = SupabaseClient<Database>;

type VehiculoStock = { id: string; marca: string; modelo: string };

/**
 * Matching simple de vehículo en el texto: puntúa marca (2) + modelo (3) y exige
 * al menos el modelo (score >= 3) para evitar falsos positivos con marcas solas.
 */
export function detectarVehiculo(
  texto: string,
  vehiculos: VehiculoStock[],
): VehiculoStock | null {
  const t = ` ${texto.toLowerCase()} `;
  let mejor: { v: VehiculoStock; score: number } | null = null;
  for (const v of vehiculos) {
    let score = 0;
    if (v.marca && t.includes(` ${v.marca.toLowerCase()} `)) score += 2;
    if (v.modelo && t.includes(v.modelo.toLowerCase())) score += 3;
    if (score >= 3 && (!mejor || score > mejor.score)) mejor = { v, score };
  }
  return mejor?.v ?? null;
}

async function asociarCliente(
  admin: Db,
  params: { empresaId: string; telefono: string; nombreContacto: string | null },
): Promise<string> {
  // Matching por sufijo de 8 dígitos sobre telefono/whatsapp del cliente.
  const sufijo = soloDigitos(params.telefono).slice(-8);
  const { data: candidatos } = await admin
    .from("cliente")
    .select("id, telefono, whatsapp")
    .eq("empresa_id", params.empresaId)
    .or(`telefono.ilike.%${sufijo}%,whatsapp.ilike.%${sufijo}%`)
    .limit(10);

  const match = (candidatos ?? []).find(
    (c) =>
      coincideTelefono(c.telefono, params.telefono) ||
      coincideTelefono(c.whatsapp, params.telefono),
  );
  if (match) return match.id;

  const { data: nuevo, error } = await admin
    .from("cliente")
    .insert({
      empresa_id: params.empresaId,
      nombre: params.nombreContacto ?? `WhatsApp ${params.telefono.slice(-4)}`,
      telefono: params.telefono,
      whatsapp: params.telefono,
      origen: "whatsapp",
      estado: "nuevo",
    })
    .select("id")
    .single();
  if (error) throw new Error(`No se pudo crear el lead: ${error.message}`);
  return nuevo.id;
}

async function detectarYAsociarVehiculo(
  admin: Db,
  params: { empresaId: string; clienteId: string; texto: string },
): Promise<void> {
  const { data: stock } = await admin
    .from("vehiculo")
    .select("id, marca, modelo")
    .eq("empresa_id", params.empresaId)
    .in("estado", ["disponible", "publicado", "en_preparacion", "reservado"])
    .limit(100);
  if (!stock || stock.length === 0) return;

  const detectado = detectarVehiculo(params.texto, stock);
  if (!detectado) return;

  const { data: cliente } = await admin
    .from("cliente")
    .select("vehiculo_interes_id")
    .eq("id", params.clienteId)
    .single();
  if (cliente && !cliente.vehiculo_interes_id) {
    await admin
      .from("cliente")
      .update({ vehiculo_interes_id: detectado.id })
      .eq("id", params.clienteId);
  }

  // Registrar la consulta cliente<->vehículo si no existe una pendiente.
  const { data: consultaPrevia } = await admin
    .from("consulta")
    .select("id")
    .eq("cliente_id", params.clienteId)
    .eq("vehiculo_id", detectado.id)
    .limit(1);
  if (!consultaPrevia || consultaPrevia.length === 0) {
    await admin.from("consulta").insert({
      empresa_id: params.empresaId,
      cliente_id: params.clienteId,
      vehiculo_id: detectado.id,
      canal: "whatsapp",
      notas: `Mencionado por WhatsApp: "${params.texto.slice(0, 120)}"`,
    });
  }
}

/** Procesa un mensaje entrante. Devuelve la conversación tocada (o null si se ignoró). */
export async function procesarMensajeEntrante(
  admin: Db,
  msg: MensajeEntrante,
): Promise<{ conversacionId: string; empresaId: string } | null> {
  const cuenta = await getAccountByPhoneNumberId(admin, msg.phoneNumberId);
  if (!cuenta) {
    console.error(`[whatsapp] webhook para phone_number_id desconocido: ${msg.phoneNumberId}`);
    return null;
  }
  const empresaId = cuenta.empresa_id;

  // Idempotencia: si el wamid ya está guardado, no repetir efectos.
  const { data: existente } = await admin
    .from("whatsapp_mensaje")
    .select("id")
    .eq("wa_message_id", msg.waMessageId)
    .maybeSingle();
  if (existente) return null;

  const conv = await obtenerOCrearConversacion(admin, {
    empresaId,
    telefono: msg.telefono,
    accountId: cuenta.id,
    nombreContacto: msg.nombreContacto,
  });

  const { error: errMsg } = await admin.from("whatsapp_mensaje").insert({
    empresa_id: empresaId,
    conversacion_id: conv.id,
    wa_message_id: msg.waMessageId,
    direccion: "entrante",
    tipo: msg.tipo,
    cuerpo: msg.cuerpo,
    estado: "recibido",
    raw_payload: msg.raw as never,
  });
  if (errMsg) {
    // Carrera entre reintentos de Meta: el unique de wamid ya lo cubrió.
    if (!errMsg.message.includes("uq_wa_msg_wamid")) {
      throw new Error(`No se pudo guardar el mensaje entrante: ${errMsg.message}`);
    }
    return null;
  }

  // Cliente/lead + conversación al día.
  let clienteId = conv.cliente_id;
  if (!clienteId) {
    clienteId = await asociarCliente(admin, {
      empresaId,
      telefono: msg.telefono,
      nombreContacto: msg.nombreContacto,
    });
  }

  await admin
    .from("whatsapp_conversacion")
    .update({
      cliente_id: clienteId,
      nombre_contacto: conv.nombre_contacto ?? msg.nombreContacto,
      estado: conv.estado === "cerrada" ? "abierta" : conv.estado,
      ultima_entrada_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
      last_message_preview: preview(msg.cuerpo ?? `[${msg.tipo}]`),
      no_leidos: conv.no_leidos + 1,
    })
    .eq("id", conv.id);

  if (msg.cuerpo) {
    await detectarYAsociarVehiculo(admin, { empresaId, clienteId, texto: msg.cuerpo });
  }

  return { conversacionId: conv.id, empresaId };
}

/** Aplica una actualización de estado (sent/delivered/read/failed) a un saliente. */
export async function procesarEstadoSaliente(admin: Db, st: EstadoSaliente): Promise<void> {
  const { data: mensaje } = await admin
    .from("whatsapp_mensaje")
    .select("id, empresa_id, estado")
    .eq("wa_message_id", st.waMessageId)
    .maybeSingle();
  if (!mensaje) return;

  // No degradar estados: leido > entregado > enviado.
  const orden: Record<string, number> = { enviado: 1, entregado: 2, leido: 3, fallado: 4 };
  if ((orden[st.estado] ?? 0) <= (orden[mensaje.estado] ?? 0)) return;

  await admin
    .from("whatsapp_mensaje")
    .update({ estado: st.estado, error_mensaje: st.errorMensaje })
    .eq("id", mensaje.id);

  if (st.estado === "fallado") {
    await registrarEventoWa(admin, {
      empresaId: mensaje.empresa_id,
      tipo: "mensaje_fallado",
      detalle: st.errorMensaje ?? "Mensaje fallado (webhook)",
      datos: { wa_message_id: st.waMessageId },
    });
  }
}

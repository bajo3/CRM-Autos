import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { normalizarTelefonoAr } from "./telefono";
import { registrarEventoWa } from "./log";

type Db = SupabaseClient<Database>;
type MotivoProgramado = Database["public"]["Enums"]["motivo_wa_programado"];

/**
 * Eventos automáticos del CRM que generan mensajes programados de WhatsApp o
 * seguimientos internos. Todas las funciones son best-effort: si falta un
 * dato (teléfono, plantilla) se omiten con un log, nunca cortan el flujo que
 * las llama (venta, alta de lead, cambio de estado).
 */

async function buscarPlantillaAprobada(sb: Db, empresaId: string, nombre: string) {
  const { data } = await sb
    .from("whatsapp_plantilla")
    .select("id, nombre, idioma")
    .eq("empresa_id", empresaId)
    .eq("nombre", nombre)
    .eq("estado", "aprobada")
    .maybeSingle();
  return data;
}

function sumarDias(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}
function sumarMeses(base: Date, meses: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + meses);
  return d;
}

const EVENTOS_VENTA: { motivo: MotivoProgramado; plantilla: string; offset: (d: Date) => Date }[] = [
  { motivo: "seguimiento", plantilla: "venta_seguimiento_entrega", offset: (d) => sumarDias(d, 3) },
  { motivo: "postventa", plantilla: "venta_postventa_30d", offset: (d) => sumarDias(d, 30) },
  { motivo: "service", plantilla: "venta_service_6m", offset: (d) => sumarMeses(d, 6) },
  { motivo: "renovacion", plantilla: "venta_renovacion_12m", offset: (d) => sumarMeses(d, 12) },
];

/**
 * Al crear una venta: +3d seguimiento de entrega, +30d postventa, +6m service,
 * +12m renovación. Usa plantillas por nombre convencional (ver
 * docs/whatsapp-integration.md) — si la agencia no las creó, se omite ese
 * mensaje puntual con un log, sin romper la venta.
 */
export async function programarMensajesVenta(
  sb: Db,
  params: { empresaId: string; ventaId: string; clienteId: string; fechaVenta: string; vehiculoDesc: string | null },
): Promise<void> {
  const { data: cliente } = await sb
    .from("cliente")
    .select("nombre, apellido, telefono, whatsapp")
    .eq("id", params.clienteId)
    .maybeSingle();
  const telefonoOriginal = cliente?.whatsapp || cliente?.telefono;
  if (!telefonoOriginal) return;
  const telefono = normalizarTelefonoAr(telefonoOriginal);
  const nombreCliente = cliente ? `${cliente.nombre} ${cliente.apellido ?? ""}`.trim() : "";
  const base = new Date(`${params.fechaVenta}T10:00:00`);

  for (const evento of EVENTOS_VENTA) {
    const plantilla = await buscarPlantillaAprobada(sb, params.empresaId, evento.plantilla);
    if (!plantilla) {
      await registrarEventoWa(sb, {
        empresaId: params.empresaId,
        tipo: "otro",
        detalle: `Venta ${params.ventaId}: se omitió el mensaje "${evento.motivo}" porque no existe la plantilla aprobada "${evento.plantilla}".`,
      });
      continue;
    }
    const { error } = await sb.from("whatsapp_programado").insert({
      empresa_id: params.empresaId,
      cliente_id: params.clienteId,
      telefono,
      send_at: evento.offset(base).toISOString(),
      plantilla_id: plantilla.id,
      plantilla_nombre: plantilla.nombre,
      idioma: plantilla.idioma,
      variables: [nombreCliente, params.vehiculoDesc ?? ""].filter(Boolean),
      motivo: evento.motivo,
      creado_por_sistema: true,
    });
    if (!error) {
      await registrarEventoWa(sb, {
        empresaId: params.empresaId,
        tipo: "programado_creado",
        detalle: `Venta ${params.ventaId}: programado "${evento.motivo}" con plantilla "${evento.plantilla}".`,
      });
    }
  }
}

/**
 * Recordatorio de cuota a -3 días del vencimiento de la próxima cuota
 * (fecha_inicio + 1 mes). Solo cubre la primera cuota pendiente al crear el
 * crédito — un recordatorio recurrente mes a mes requeriría un job diario
 * propio, fuera de alcance de esta etapa (ver docs/whatsapp-integration.md).
 */
export async function programarRecordatorioCuota(
  sb: Db,
  params: { empresaId: string; clienteId: string; fechaInicio: string },
): Promise<void> {
  const plantilla = await buscarPlantillaAprobada(sb, params.empresaId, "cuota_recordatorio");
  if (!plantilla) {
    await registrarEventoWa(sb, {
      empresaId: params.empresaId,
      tipo: "otro",
      detalle: `Crédito de cliente ${params.clienteId}: se omitió el recordatorio de cuota porque no existe la plantilla aprobada "cuota_recordatorio".`,
    });
    return;
  }
  const { data: cliente } = await sb
    .from("cliente")
    .select("nombre, apellido, telefono, whatsapp")
    .eq("id", params.clienteId)
    .maybeSingle();
  const telefonoOriginal = cliente?.whatsapp || cliente?.telefono;
  if (!telefonoOriginal) return;
  const telefono = normalizarTelefonoAr(telefonoOriginal);
  const nombreCliente = cliente ? `${cliente.nombre} ${cliente.apellido ?? ""}`.trim() : "";

  const proximaCuota = sumarMeses(new Date(`${params.fechaInicio}T10:00:00`), 1);
  const recordatorio = sumarDias(proximaCuota, -3);

  await sb.from("whatsapp_programado").insert({
    empresa_id: params.empresaId,
    cliente_id: params.clienteId,
    telefono,
    send_at: recordatorio.toISOString(),
    plantilla_id: plantilla.id,
    plantilla_nombre: plantilla.nombre,
    idioma: plantilla.idioma,
    variables: [nombreCliente].filter(Boolean),
    motivo: "cuota",
    creado_por_sistema: true,
  });
}

/**
 * Lead nuevo llegado por WhatsApp: seguimientos INTERNOS (no mensajes
 * salientes, para no violar la ventana de 24h si nadie respondió) a +1 y +3
 * días para que un vendedor retome el contacto.
 */
export async function programarSeguimientosLeadWhatsapp(
  sb: Db,
  params: { empresaId: string; clienteId: string },
): Promise<void> {
  const hoy = new Date();
  const filas = [
    { dias: 1, motivo: "Lead nuevo por WhatsApp sin respuesta (+1 día)" },
    { dias: 3, motivo: "Lead nuevo por WhatsApp sin respuesta (+3 días)" },
  ];
  for (const f of filas) {
    await sb.from("seguimiento").insert({
      empresa_id: params.empresaId,
      cliente_id: params.clienteId,
      fecha: sumarDias(hoy, f.dias).toISOString().slice(0, 10),
      motivo: f.motivo,
      estado: "pendiente",
    });
  }
}

/**
 * Cierra automáticamente los seguimientos vencidos/de hoy de un cliente cuando
 * vuelve a escribir por WhatsApp: el contacto que el seguimiento pedía ya se
 * dio, así que el vendedor no tiene que ir a marcarlo a mano. No toca
 * seguimientos futuros (todavía no vencen).
 */
export async function cerrarSeguimientosPorRespuesta(
  sb: Db,
  params: { empresaId: string; clienteId: string },
): Promise<void> {
  const hoy = new Date().toISOString().slice(0, 10);
  const { data } = await sb
    .from("seguimiento")
    .update({ estado: "realizado" })
    .eq("empresa_id", params.empresaId)
    .eq("cliente_id", params.clienteId)
    .in("estado", ["pendiente", "vencido"])
    .lte("fecha", hoy)
    .select("id");
  if (data && data.length > 0) {
    await registrarEventoWa(sb, {
      empresaId: params.empresaId,
      tipo: "otro",
      detalle: `${data.length} seguimiento(s) cerrados automáticamente: el cliente respondió por WhatsApp.`,
      datos: { cliente_id: params.clienteId },
    });
  }
}

/** Cancela los programados pendientes de un cliente (al pasar a vendido/reservado/perdido). */
export async function cancelarProgramadosDeCliente(
  sb: Db,
  params: { empresaId: string; clienteId: string },
): Promise<void> {
  const { data } = await sb
    .from("whatsapp_programado")
    .update({ estado: "cancelado" })
    .eq("empresa_id", params.empresaId)
    .eq("cliente_id", params.clienteId)
    .eq("estado", "pendiente")
    .select("id");
  if (data && data.length > 0) {
    await registrarEventoWa(sb, {
      empresaId: params.empresaId,
      tipo: "programado_cancelado",
      detalle: `${data.length} programado(s) cancelados por cambio de estado del cliente ${params.clienteId}.`,
    });
  }
}

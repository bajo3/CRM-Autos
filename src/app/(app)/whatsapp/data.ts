import { createClient } from "@/lib/supabase/server";
import { rel, type Rel } from "@/lib/rel";
import { PAGE_SIZE } from "./lib";

export type ConversacionListItem = {
  id: string;
  telefono: string;
  nombre_contacto: string | null;
  estado: "abierta" | "pendiente" | "cerrada";
  asignado_a: string | null;
  bot_activo: boolean;
  bot_pausado_hasta: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  no_leidos: number;
  cliente: Rel<{ id: string; nombre: string; apellido: string | null; estado: string }>;
};

export type FiltrosBandeja = {
  q?: string;
  estado?: string;
  sin_asignar?: string;
  bot?: string;
  page?: string;
};

export async function listarConversaciones(empresaId: string, filtros: FiltrosBandeja) {
  const sb = createClient();
  const page = Math.max(1, Number(filtros.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = sb
    .from("whatsapp_conversacion")
    .select(
      "id, telefono, nombre_contacto, estado, asignado_a, bot_activo, bot_pausado_hasta, last_message_at, last_message_preview, no_leidos, cliente:cliente_id(id,nombre,apellido,estado)",
      { count: "exact" },
    )
    .eq("empresa_id", empresaId)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (filtros.estado && ["abierta", "pendiente", "cerrada"].includes(filtros.estado)) {
    query = query.eq("estado", filtros.estado as never);
  }
  if (filtros.sin_asignar === "1") {
    query = query.is("asignado_a", null);
  }
  if (filtros.bot === "on") {
    query = query.eq("bot_activo", true).or(`bot_pausado_hasta.is.null,bot_pausado_hasta.lt.${new Date().toISOString()}`);
  } else if (filtros.bot === "off") {
    query = query.or(`bot_activo.eq.false,bot_pausado_hasta.gt.${new Date().toISOString()}`);
  }

  if (filtros.q) {
    const q = filtros.q.trim();
    const clienteIds = await clienteIdsPorVehiculo(sb, empresaId, q);
    const clausulas = [`nombre_contacto.ilike.%${q}%`, `telefono.ilike.%${q}%`];
    if (clienteIds.length > 0) {
      clausulas.push(`cliente_id.in.(${clienteIds.join(",")})`);
    }
    query = query.or(clausulas.join(","));
  }

  const { data, count } = await query.returns<ConversacionListItem[]>();
  return { conversaciones: data ?? [], total: count ?? 0, page };
}

/** Clientes cuyo vehículo de interés coincide con el texto buscado (marca/modelo). */
async function clienteIdsPorVehiculo(
  sb: ReturnType<typeof createClient>,
  empresaId: string,
  q: string,
): Promise<string[]> {
  const { data: vehiculos } = await sb
    .from("vehiculo")
    .select("id")
    .eq("empresa_id", empresaId)
    .or(`marca.ilike.%${q}%,modelo.ilike.%${q}%`)
    .limit(50);
  if (!vehiculos || vehiculos.length === 0) return [];

  const { data: clientes } = await sb
    .from("cliente")
    .select("id")
    .eq("empresa_id", empresaId)
    .in("vehiculo_interes_id", vehiculos.map((v) => v.id))
    .limit(200);
  return (clientes ?? []).map((c) => c.id);
}

export { botEfectivo } from "@/lib/whatsapp/service";

export function nombreConversacion(c: ConversacionListItem): string {
  const cliente = rel(c.cliente);
  if (cliente) return `${cliente.nombre} ${cliente.apellido ?? ""}`.trim();
  return c.nombre_contacto || c.telefono;
}

export type ConversacionDetalle = {
  id: string;
  empresa_id: string;
  telefono: string;
  nombre_contacto: string | null;
  estado: "abierta" | "pendiente" | "cerrada";
  asignado_a: string | null;
  bot_activo: boolean;
  bot_pausado_hasta: string | null;
  ultima_entrada_at: string | null;
  cliente: Rel<{
    id: string;
    nombre: string;
    apellido: string | null;
    estado: string;
    presupuesto_aprox: number | null;
    vehiculo_interes: Rel<{ id: string; marca: string; modelo: string; anio: number | null }>;
  }>;
  asignado: Rel<{ id: string; nombre: string; apellido: string }>;
};

export type MensajeRow = {
  id: string;
  direccion: "entrante" | "saliente";
  tipo: string;
  cuerpo: string | null;
  estado: string;
  error_mensaje: string | null;
  enviado_por_bot: boolean;
  created_at: string;
};

const MENSAJES_LIMIT = 100;

export async function obtenerConversacionDetalle(
  empresaId: string,
  conversacionId: string,
): Promise<{ conversacion: ConversacionDetalle; mensajes: MensajeRow[] } | null> {
  const sb = createClient();

  const { data: conversacion } = await sb
    .from("whatsapp_conversacion")
    .select(
      "id, empresa_id, telefono, nombre_contacto, estado, asignado_a, bot_activo, bot_pausado_hasta, ultima_entrada_at, " +
        "cliente:cliente_id(id,nombre,apellido,estado,presupuesto_aprox,vehiculo_interes:vehiculo_interes_id(id,marca,modelo,anio)), " +
        "asignado:asignado_a(id,nombre,apellido)",
    )
    .eq("id", conversacionId)
    .eq("empresa_id", empresaId)
    .maybeSingle<ConversacionDetalle>();
  if (!conversacion) return null;

  const { data: mensajes } = await sb
    .from("whatsapp_mensaje")
    .select("id, direccion, tipo, cuerpo, estado, error_mensaje, enviado_por_bot, created_at")
    .eq("conversacion_id", conversacionId)
    .order("created_at", { ascending: false })
    .limit(MENSAJES_LIMIT)
    .returns<MensajeRow[]>();

  return { conversacion, mensajes: (mensajes ?? []).slice().reverse() };
}

export async function listarPlantillasAprobadas(empresaId: string) {
  const sb = createClient();
  const { data } = await sb
    .from("whatsapp_plantilla")
    .select("id, nombre, idioma, cuerpo, variables_schema")
    .eq("empresa_id", empresaId)
    .order("nombre")
    .returns<{ id: string; nombre: string; idioma: string; cuerpo: string; variables_schema: unknown }[]>();
  return data ?? [];
}

export type BotConfigRow = {
  id: string;
  habilitado: boolean;
  nombre_comercial: string | null;
  direccion: string | null;
  horarios: string | null;
  financiacion: string | null;
  politica_permuta: string | null;
  mensaje_fallback: string;
  keywords_handoff: unknown;
  tono: string;
  pausa_intervencion_min: number;
};

export async function obtenerBotConfig(empresaId: string): Promise<BotConfigRow | null> {
  const sb = createClient();
  const { data } = await sb
    .from("whatsapp_bot_config")
    .select("id, habilitado, nombre_comercial, direccion, horarios, financiacion, politica_permuta, mensaje_fallback, keywords_handoff, tono, pausa_intervencion_min")
    .eq("empresa_id", empresaId)
    .maybeSingle<BotConfigRow>();
  return data;
}

export async function listarVendedores(empresaId: string) {
  const sb = createClient();
  const { data } = await sb
    .from("profile")
    .select("id, nombre, apellido")
    .eq("empresa_id", empresaId)
    .eq("activo", true)
    .order("nombre")
    .returns<{ id: string; nombre: string; apellido: string }[]>();
  return data ?? [];
}

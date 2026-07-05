import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { formatARS } from "@/lib/format";
import { detectarVehiculo } from "./inbound";

type Db = SupabaseClient<Database>;
type BotConfig = Database["public"]["Tables"]["whatsapp_bot_config"]["Row"];

export type RespuestaBot = {
  /** null = el bot no responde (deshabilitado o error silencioso). */
  respuesta: string | null;
  handoff: boolean;
  motivoHandoff?: string;
};

const KEYWORDS_ENOJO = [
  "estafa", "pesimo", "pésimo", "terrible", "horrible", "denuncia", "reclamo",
  "harto", "harta", "indignado", "indignada", "verguenza", "vergüenza", "nunca mas", "nunca más",
];

const KEYWORDS_NEGOCIACION = [
  "descuento", "mejor precio", "rebaja", "me hacen precio", "más barato", "mas barato",
  "algo menos", "una rebaja", "seña menor",
];

const KEYWORDS_COMPRA = [
  "quiero comprarlo", "quiero comprarla", "lo compro", "la compro", "quiero reservarlo",
  "quiero reservarla", "como pago", "cómo pago", "cuando lo retiro", "cuándo lo retiro",
];

const KEYWORDS_STOCK = ["que autos", "qué autos", "catalogo", "catálogo", "que tienen", "qué tienen", "modelos", "stock"];
const KEYWORDS_HORARIO = ["horario", "que hora", "qué hora", "cuando abren", "cuándo abren", "atienden"];
const KEYWORDS_UBICACION = ["donde estan", "dónde están", "direccion", "dirección", "ubicacion", "ubicación", "como llego", "cómo llego"];
const KEYWORDS_FINANCIACION = ["financiacion", "financiación", "credito", "crédito", "cuotas", "financian"];
const KEYWORDS_PERMUTA = ["permuta", "tomo mi auto", "tomas usado", "tomás usado", "parte de pago"];
const KEYWORDS_SALUDO = ["hola", "buenas", "buen dia", "buen día", "buenos dias", "buenos días", "buenas tardes", "buenas noches"];

function contieneAlguna(texto: string, keywords: string[]): boolean {
  const t = texto.toLowerCase();
  return keywords.some((k) => t.includes(k));
}

async function stockResumen(sb: Db, empresaId: string, max = 20) {
  const { data } = await sb
    .from("vehiculo")
    .select("id, marca, modelo, version, anio, kilometros, precio_venta, estado")
    .eq("empresa_id", empresaId)
    .in("estado", ["disponible", "publicado"])
    .order("created_at", { ascending: false })
    .limit(max);
  return data ?? [];
}

/** Reglas de handoff determinísticas: corren SIEMPRE, con o sin IA. Exportada para tests. */
export function chequeoHandoffPrevio(texto: string, config: BotConfig): { handoff: boolean; motivo?: string } {
  const keywords = Array.isArray(config.keywords_handoff) ? (config.keywords_handoff as string[]) : [];
  if (contieneAlguna(texto, keywords)) return { handoff: true, motivo: "palabra_clave" };
  if (contieneAlguna(texto, KEYWORDS_ENOJO)) return { handoff: true, motivo: "enojo_reclamo" };
  if (contieneAlguna(texto, KEYWORDS_NEGOCIACION)) return { handoff: true, motivo: "negociacion_precio" };
  if (contieneAlguna(texto, KEYWORDS_COMPRA)) return { handoff: true, motivo: "intencion_compra" };
  return { handoff: false };
}

/** Motor sin IA: reglas + datos reales. Cubre las consultas básicas del negocio. */
async function respuestaDeterministica(
  sb: Db,
  empresaId: string,
  config: BotConfig,
  texto: string,
): Promise<RespuestaBot> {
  const nombreComercial = config.nombre_comercial || "la agencia";

  if (contieneAlguna(texto, KEYWORDS_HORARIO)) {
    if (!config.horarios) return { respuesta: null, handoff: true, motivoHandoff: "sin_dato_horarios" };
    return { respuesta: `Nuestro horario de atención: ${config.horarios}`, handoff: false };
  }

  if (contieneAlguna(texto, KEYWORDS_UBICACION)) {
    if (!config.direccion) return { respuesta: null, handoff: true, motivoHandoff: "sin_dato_direccion" };
    return { respuesta: `Estamos en ${config.direccion}.`, handoff: false };
  }

  if (contieneAlguna(texto, KEYWORDS_FINANCIACION)) {
    if (!config.financiacion) return { respuesta: null, handoff: true, motivoHandoff: "sin_dato_financiacion" };
    return { respuesta: config.financiacion, handoff: false };
  }

  if (contieneAlguna(texto, KEYWORDS_PERMUTA)) {
    if (!config.politica_permuta) return { respuesta: null, handoff: true, motivoHandoff: "sin_dato_permuta" };
    return { respuesta: config.politica_permuta, handoff: false };
  }

  const stock = await stockResumen(sb, empresaId);
  const vehiculoMencionado = detectarVehiculo(texto, stock);
  if (vehiculoMencionado) {
    const v = stock.find((s) => s.id === vehiculoMencionado.id);
    if (v) {
      const precio = v.precio_venta ? formatARS(v.precio_venta) : "a consultar";
      return {
        respuesta:
          `${v.marca} ${v.modelo}${v.version ? ` ${v.version}` : ""}${v.anio ? ` (${v.anio})` : ""}, ` +
          `${v.kilometros != null ? `${v.kilometros.toLocaleString("es-AR")} km` : "0 km"}. Precio: ${precio}. ` +
          `¿Querés coordinar para verla o hacer una prueba de manejo?`,
        handoff: false,
      };
    }
  }

  if (contieneAlguna(texto, KEYWORDS_STOCK)) {
    if (stock.length === 0) {
      return { respuesta: `Por el momento no tenemos unidades publicadas en ${nombreComercial}. Te derivo con un asesor.`, handoff: true, motivoHandoff: "sin_stock" };
    }
    const listado = stock
      .slice(0, 5)
      .map((v) => `• ${v.marca} ${v.modelo}${v.anio ? ` ${v.anio}` : ""} — ${v.precio_venta ? formatARS(v.precio_venta) : "a consultar"}`)
      .join("\n");
    const extra = stock.length > 5 ? `\n…y ${stock.length - 5} unidades más.` : "";
    return { respuesta: `Estas son algunas unidades disponibles:\n${listado}${extra}\n¿Te interesa alguna en particular?`, handoff: false };
  }

  if (contieneAlguna(texto, KEYWORDS_SALUDO)) {
    return {
      respuesta: `¡Hola! Somos ${nombreComercial} 🚗 Contame qué auto estás buscando o preguntame por precio, stock, horarios o financiación.`,
      handoff: false,
    };
  }

  return { respuesta: null, handoff: true, motivoHandoff: "no_sabe_responder" };
}

type MensajeContexto = { direccion: "entrante" | "saliente"; cuerpo: string | null; enviado_por_bot: boolean };

async function respuestaConIA(
  sb: Db,
  empresaId: string,
  config: BotConfig,
  texto: string,
  historial: MensajeContexto[],
  clienteNombre: string | null,
): Promise<RespuestaBot> {
  const stock = await stockResumen(sb, empresaId, 20);
  const stockTexto = stock.length
    ? stock
        .map((v) => `- ${v.marca} ${v.modelo}${v.version ? ` ${v.version}` : ""} ${v.anio ?? ""}, ${v.kilometros ?? 0}km, ${v.precio_venta ? formatARS(v.precio_venta) : "precio a consultar"} (id:${v.id})`)
        .join("\n")
    : "(sin unidades publicadas actualmente)";

  const tonoDesc = { profesional: "profesional y cordial", cercano: "cercano y amigable", breve: "breve y directo" }[config.tono] ?? "profesional";

  const system = `Sos el asistente de WhatsApp de "${config.nombre_comercial || "la agencia"}", una concesionaria de autos en Argentina.
Tono: ${tonoDesc}. Respondé siempre en español rioplatense, en 1-3 oraciones cortas, sin markdown.

REGLAS ESTRICTAS (nunca las rompas):
- Respondé SOLO sobre: stock disponible, precios, financiación, permuta, ubicación, horarios, requisitos, reserva, test drive, presupuesto, postventa.
- NUNCA inventes un auto, precio o condición de financiación que no esté en los datos de abajo.
- Si no hay datos de financiación abajo, NO prometas financiación: derivá.
- Si la consulta no es sobre el negocio, o no tenés el dato, o el cliente quiere negociar precio, muestra intención firme de compra, o está enojado/reclama: respondé exactamente con handoff=true y reply="".

DATOS DEL NEGOCIO:
Dirección: ${config.direccion || "(no informada)"}
Horarios: ${config.horarios || "(no informados)"}
Financiación: ${config.financiacion || "(no ofrecemos financiación por el momento)"}
Permutas: ${config.politica_permuta || "(no informado)"}

STOCK REAL:
${stockTexto}

Cliente: ${clienteNombre || "sin nombre registrado"}.

Respondé ÚNICAMENTE un JSON válido (sin texto extra) con esta forma exacta:
{"reply": "string", "handoff": boolean}`;

  const mensajesApi = [
    ...historial.slice(-10).map((m) => ({
      role: m.direccion === "entrante" ? "user" as const : "assistant" as const,
      content: m.cuerpo || "",
    })),
    { role: "user" as const, content: texto },
  ].filter((m) => m.content.trim().length > 0);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return respuestaDeterministica(sb, empresaId, config, texto);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system,
        messages: mensajesApi,
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API respondió ${res.status}`);
    const json = await res.json();
    const textoRespuesta = (json.content?.[0]?.text as string | undefined) ?? "";
    const parsed = JSON.parse(textoRespuesta) as { reply?: string; handoff?: boolean };
    if (parsed.handoff || !parsed.reply?.trim()) {
      return { respuesta: null, handoff: true, motivoHandoff: "ia_derivo" };
    }
    return { respuesta: parsed.reply.trim(), handoff: false };
  } catch (err) {
    console.error("[whatsapp/bot] fallback a motor determinístico por error de IA:", err);
    return respuestaDeterministica(sb, empresaId, config, texto);
  }
}

/**
 * Genera la respuesta del bot para un mensaje entrante, aplicando primero las
 * reglas de handoff determinísticas (keywords, enojo, negociación, intención
 * de compra) y luego IA (si hay ANTHROPIC_API_KEY) o el motor local con datos
 * reales de stock/config. `respuesta: null` con `handoff: true` significa que
 * el llamador debe pausar el bot y enviar el mensaje de fallback configurado.
 */
export async function generarRespuestaBot(
  sb: Db,
  params: {
    empresaId: string;
    texto: string;
    historial: MensajeContexto[];
    clienteNombre: string | null;
  },
): Promise<RespuestaBot> {
  const { data: config } = await sb
    .from("whatsapp_bot_config")
    .select("*")
    .eq("empresa_id", params.empresaId)
    .maybeSingle();
  if (!config || !config.habilitado) return { respuesta: null, handoff: false };

  const previo = chequeoHandoffPrevio(params.texto, config);
  if (previo.handoff) return { respuesta: null, handoff: true, motivoHandoff: previo.motivo };

  return respuestaConIA(sb, params.empresaId, config, params.texto, params.historial, params.clienteNombre);
}

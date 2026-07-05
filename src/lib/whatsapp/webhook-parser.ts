/**
 * Parseo puro del payload del webhook de WhatsApp Cloud API.
 * Sin I/O: extrae mensajes entrantes y actualizaciones de estado
 * de la estructura entry[].changes[].value. Testeable con fixtures.
 */

export type MensajeEntrante = {
  phoneNumberId: string;
  waMessageId: string;
  telefono: string; // wa_id E.164 sin '+'
  nombreContacto: string | null;
  timestamp: number; // epoch segundos
  tipo: "texto" | "imagen" | "audio" | "documento" | "video" | "otro";
  cuerpo: string | null;
  raw: unknown;
};

export type EstadoSaliente = {
  phoneNumberId: string;
  waMessageId: string;
  estado: "enviado" | "entregado" | "leido" | "fallado";
  errorMensaje: string | null;
  raw: unknown;
};

const MAPA_TIPO: Record<string, MensajeEntrante["tipo"]> = {
  text: "texto",
  image: "imagen",
  audio: "audio",
  voice: "audio",
  document: "documento",
  video: "video",
};

const MAPA_ESTADO: Record<string, EstadoSaliente["estado"]> = {
  sent: "enviado",
  delivered: "entregado",
  read: "leido",
  failed: "fallado",
};

type PayloadWebhook = {
  entry?: {
    changes?: {
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: { wa_id?: string; profile?: { name?: string } }[];
        messages?: Record<string, unknown>[];
        statuses?: Record<string, unknown>[];
      };
    }[];
  }[];
};

function cuerpoDeMensaje(msg: Record<string, unknown>): string | null {
  const tipo = String(msg.type ?? "");
  if (tipo === "text") {
    const text = msg.text as { body?: string } | undefined;
    return text?.body ?? null;
  }
  // Media: caption si hay (la descarga de media queda para producción).
  const media = msg[tipo] as { caption?: string } | undefined;
  return media?.caption ?? null;
}

export function parseWebhookPayload(payload: unknown): {
  mensajes: MensajeEntrante[];
  estados: EstadoSaliente[];
} {
  const mensajes: MensajeEntrante[] = [];
  const estados: EstadoSaliente[] = [];
  const p = payload as PayloadWebhook;

  for (const entry of p.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages" || !change.value) continue;
      const value = change.value;
      const phoneNumberId = value.metadata?.phone_number_id ?? "";
      if (!phoneNumberId) continue;

      const nombrePorWaId = new Map<string, string>();
      for (const c of value.contacts ?? []) {
        if (c.wa_id && c.profile?.name) nombrePorWaId.set(c.wa_id, c.profile.name);
      }

      for (const msg of value.messages ?? []) {
        const waMessageId = String(msg.id ?? "");
        const telefono = String(msg.from ?? "");
        if (!waMessageId || !telefono) continue;
        mensajes.push({
          phoneNumberId,
          waMessageId,
          telefono,
          nombreContacto: nombrePorWaId.get(telefono) ?? null,
          timestamp: parseInt(String(msg.timestamp ?? "0"), 10) || 0,
          tipo: MAPA_TIPO[String(msg.type ?? "")] ?? "otro",
          cuerpo: cuerpoDeMensaje(msg),
          raw: msg,
        });
      }

      for (const st of value.statuses ?? []) {
        const waMessageId = String(st.id ?? "");
        const estado = MAPA_ESTADO[String(st.status ?? "")];
        if (!waMessageId || !estado) continue;
        const errores = st.errors as { message?: string; title?: string }[] | undefined;
        estados.push({
          phoneNumberId,
          waMessageId,
          estado,
          errorMensaje: errores?.[0]?.message ?? errores?.[0]?.title ?? null,
          raw: st,
        });
      }
    }
  }

  return { mensajes, estados };
}

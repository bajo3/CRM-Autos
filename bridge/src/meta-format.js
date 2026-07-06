import { createHmac } from "node:crypto";

/**
 * Conversión pura Baileys <-> formato Meta Cloud API.
 * Sin I/O: estas funciones solo arman/leen objetos planos, para poder
 * testearlas o revisarlas sin levantar una sesión real de WhatsApp.
 */

/** Quita el sufijo @s.whatsapp.net / @g.us / :device de un JID de Baileys. */
export function telefonoDesdeJid(jid) {
  if (!jid) return "";
  return String(jid).split("@")[0].split(":")[0];
}

/** Arma el JID individual que espera Baileys a partir de un teléfono E.164 sin '+'. */
export function jidDesdeTelefono(telefono) {
  return `${telefono}@s.whatsapp.net`;
}

/**
 * Construye el payload EXACTO que espera webhook-parser.ts del CRM
 * (entry[].changes[].value.{metadata,contacts,messages}) para un mensaje de texto entrante.
 */
export function construirWebhookMensajeTexto({ phoneNumberId, telefono, nombreContacto, waMessageId, timestampSegundos, texto }) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: phoneNumberId,
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: phoneNumberId,
                phone_number_id: phoneNumberId,
              },
              contacts: [
                {
                  profile: { name: nombreContacto || telefono },
                  wa_id: telefono,
                },
              ],
              messages: [
                {
                  from: telefono,
                  id: waMessageId,
                  timestamp: String(timestampSegundos),
                  type: "text",
                  text: { body: texto },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

/** Extrae el texto de un mensaje entrante de Baileys (messages.upsert), o null si no es texto. */
export function textoDeMensajeBaileys(msg) {
  const m = msg?.message;
  if (!m) return null;
  if (typeof m.conversation === "string") return m.conversation;
  if (typeof m.extendedTextMessage?.text === "string") return m.extendedTextMessage.text;
  return null;
}

/** Firma HMAC-SHA256 de un raw body, en el formato de header X-Hub-Signature-256 de Meta. */
export function firmarPayload(rawBody, secret) {
  const hex = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return `sha256=${hex}`;
}

/**
 * Valida (y traduce a un mensaje de sendMessage de Baileys) un payload de envío
 * formato Graph API (`POST /{phone_number_id}/messages`). Soporta type:"text".
 * Devuelve { ok:true, jid, contenido } o { ok:false, status, error } (shape Graph API de error).
 */
export function traducirPayloadEnvio(payload) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, status: 400, error: { message: "Body inválido: se esperaba un objeto JSON." } };
  }
  if (payload.messaging_product !== "whatsapp") {
    return { ok: false, status: 400, error: { message: "messaging_product debe ser 'whatsapp'." } };
  }
  if (!payload.to || typeof payload.to !== "string") {
    return { ok: false, status: 400, error: { message: "Falta 'to' (teléfono E.164 sin '+')." } };
  }
  if (payload.type !== "text") {
    return {
      ok: false,
      status: 400,
      error: {
        message: `(#131009) El bridge Baileys (beta) todavía no soporta type:"${payload.type}". Solo se soporta "text".`,
        type: "OAuthException",
        code: 131009,
      },
    };
  }
  const body = payload.text?.body;
  if (!body || typeof body !== "string") {
    return { ok: false, status: 400, error: { message: "Falta 'text.body' para un mensaje de tipo text." } };
  }
  return { ok: true, jid: jidDesdeTelefono(payload.to), contenido: { text: body } };
}

/** Arma la respuesta de éxito formato Graph API para un envío. */
export function respuestaEnvioOk(waMessageId) {
  return { messaging_product: "whatsapp", messages: [{ id: waMessageId }] };
}

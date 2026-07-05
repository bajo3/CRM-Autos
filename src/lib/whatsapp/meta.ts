import { randomUUID } from "crypto";

/**
 * Llamadas a la Graph API de WhatsApp Cloud.
 * Con WHATSAPP_FAKE_SEND=1 no se llama a Meta: se simula una respuesta OK
 * (permite QA de punta a punta sin cuenta de WhatsApp real).
 */

const API_VERSION = process.env.WHATSAPP_API_VERSION ?? "v21.0";

export class WhatsAppApiError extends Error {
  readonly detalle: unknown;
  constructor(message: string, detalle: unknown) {
    super(message);
    this.name = "WhatsAppApiError";
    this.detalle = detalle;
  }
}

export function envioSimulado(): boolean {
  return process.env.WHATSAPP_FAKE_SEND === "1";
}

type MetaSendResponse = {
  messages?: { id: string }[];
  [k: string]: unknown;
};

export async function metaPost(
  phoneNumberId: string,
  accessToken: string,
  payload: Record<string, unknown>,
): Promise<MetaSendResponse> {
  if (envioSimulado()) {
    return { messages: [{ id: `wamid.FAKE.${randomUUID()}` }], fake: true };
  }
  const res = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );
  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = json as { error?: { message?: string } };
    throw new WhatsAppApiError(
      err.error?.message ?? `WhatsApp API respondió ${res.status}`,
      json,
    );
  }
  return json as MetaSendResponse;
}

/** Valida un phone_number_id + token contra la Graph API antes de guardar la conexión. */
export async function testearConexionMeta(
  phoneNumberId: string,
  accessToken: string,
): Promise<{ ok: true; displayPhoneNumber: string } | { ok: false; error: string }> {
  if (envioSimulado()) {
    return { ok: true, displayPhoneNumber: "+54 9 (simulado, WHATSAPP_FAKE_SEND=1)" };
  }
  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}?fields=display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
    );
    const json: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = json as { error?: { message?: string } };
      return { ok: false, error: err.error?.message ?? `Meta respondió ${res.status}` };
    }
    const data = json as { display_phone_number?: string };
    return { ok: true, displayPhoneNumber: data.display_phone_number ?? phoneNumberId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "No se pudo contactar a Meta." };
  }
}

/** Intercambia el `code` del flujo Embedded Signup por un access token de negocio. */
export async function intercambiarCodigoOAuth(
  code: string,
): Promise<{ ok: true; accessToken: string } | { ok: false; error: string }> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return { ok: false, error: "Falta META_APP_ID / META_APP_SECRET en el servidor." };

  try {
    const url = `https://graph.facebook.com/${API_VERSION}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${encodeURIComponent(code)}`;
    const res = await fetch(url, { cache: "no-store" });
    const json: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = json as { error?: { message?: string } };
      return { ok: false, error: err.error?.message ?? `Meta respondió ${res.status}` };
    }
    const data = json as { access_token?: string };
    if (!data.access_token) return { ok: false, error: "Meta no devolvió un access_token." };
    return { ok: true, accessToken: data.access_token };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "No se pudo contactar a Meta." };
  }
}

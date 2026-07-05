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

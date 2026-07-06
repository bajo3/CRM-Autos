import { randomUUID } from "crypto";
import { envioSimulado, WhatsAppApiError } from "./meta";

/**
 * Cliente del bridge Baileys (WhatsApp por QR, beta no oficial).
 * Habla el mismo contrato que meta.ts: bridgePost() devuelve el mismo shape
 * que metaPost() y lanza WhatsAppApiError en error, para que service.ts pueda
 * elegir transporte sin bifurcar el resto del pipeline.
 */

type MetaSendResponse = {
  messages?: { id: string }[];
  [k: string]: unknown;
};

export type BridgeStatus = {
  status: "qr" | "connecting" | "connected" | "disconnected";
  qrDataUrl?: string | null;
  phone?: string | null;
};

function baseUrl(): string {
  const url = process.env.WHATSAPP_BRIDGE_URL;
  if (!url) throw new Error("Falta WHATSAPP_BRIDGE_URL en el entorno del servidor.");
  return url.replace(/\/$/, "");
}

function secret(): string {
  const s = process.env.WHATSAPP_BRIDGE_SECRET;
  if (!s) throw new Error("Falta WHATSAPP_BRIDGE_SECRET en el entorno del servidor.");
  return s;
}

async function bridgeFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${secret()}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
}

/** Envía un payload formato Graph API por el bridge Baileys de una empresa. */
export async function bridgePost(
  empresaId: string,
  payload: Record<string, unknown>,
): Promise<MetaSendResponse> {
  if (envioSimulado()) {
    return { messages: [{ id: `wamid.FAKE.${randomUUID()}` }], fake: true };
  }
  const res = await bridgeFetch(`/sessions/${empresaId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = json as { error?: { message?: string } };
    throw new WhatsAppApiError(
      err.error?.message ?? `Bridge WhatsApp respondió ${res.status}`,
      json,
    );
  }
  return json as MetaSendResponse;
}

/** Consulta el estado de la sesión Baileys de una empresa (qr / connecting / connected / disconnected). */
export async function bridgeStatus(empresaId: string): Promise<BridgeStatus> {
  const res = await bridgeFetch(`/sessions/${empresaId}/status`, { method: "GET" });
  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = json as { error?: { message?: string } };
    throw new WhatsAppApiError(
      err.error?.message ?? `Bridge WhatsApp respondió ${res.status}`,
      json,
    );
  }
  return json as BridgeStatus;
}

/** Inicia (o retoma) la sesión Baileys de una empresa. */
export async function bridgeStart(empresaId: string): Promise<{ status: string }> {
  const res = await bridgeFetch(`/sessions/${empresaId}/start`, { method: "POST" });
  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = json as { error?: { message?: string } };
    throw new WhatsAppApiError(
      err.error?.message ?? `Bridge WhatsApp respondió ${res.status}`,
      json,
    );
  }
  return json as { status: string };
}

/** Cierra sesión (logout) en el bridge y borra su estado local. */
export async function bridgeLogout(empresaId: string): Promise<void> {
  const res = await bridgeFetch(`/sessions/${empresaId}`, { method: "DELETE" });
  if (!res.ok) {
    const json: unknown = await res.json().catch(() => ({}));
    const err = json as { error?: { message?: string } };
    throw new WhatsAppApiError(
      err.error?.message ?? `Bridge WhatsApp respondió ${res.status}`,
      json,
    );
  }
}

/** ¿Está habilitado el modo beta Baileys en este servidor? (para mostrar/ocultar UI). */
export function bridgeHabilitado(): boolean {
  return Boolean(process.env.WHATSAPP_BRIDGE_URL);
}

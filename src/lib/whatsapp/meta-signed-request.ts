import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verificación del `signed_request` que Meta manda a los callbacks de
 * cumplimiento (deauthorize, data deletion request). Formato:
 * `<firma_base64url>.<payload_base64url_json>`, firma = HMAC-SHA256(payload, app_secret).
 * Referencia: https://developers.facebook.com/docs/facebook-login/guides/permissions/data-deletion
 */

type SignedRequestPayload = {
  algorithm?: string;
  issued_at?: number;
  user_id?: string;
  [k: string]: unknown;
};

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

/**
 * Devuelve el payload si la firma es válida, o null si falta el secret,
 * el formato es inválido, o la firma no coincide.
 */
export function verificarSignedRequest(
  signedRequest: string,
  appSecret: string | undefined,
): SignedRequestPayload | null {
  if (!appSecret) return null;
  const partes = signedRequest.split(".");
  if (partes.length !== 2) return null;
  const [firmaB64, payloadB64] = partes;

  const firmaRecibida = base64UrlDecode(firmaB64);
  const firmaEsperada = createHmac("sha256", appSecret).update(payloadB64).digest();
  if (firmaRecibida.length !== firmaEsperada.length) return null;
  if (!timingSafeEqual(firmaRecibida, firmaEsperada)) return null;

  try {
    const json = base64UrlDecode(payloadB64).toString("utf8");
    const payload = JSON.parse(json) as SignedRequestPayload;
    if (payload.algorithm && payload.algorithm.toUpperCase() !== "HMAC-SHA256") return null;
    return payload;
  } catch {
    return null;
  }
}

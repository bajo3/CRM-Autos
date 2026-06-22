/**
 * Firma del parámetro `state` del flujo OAuth.
 *
 * El callback de MercadoLibre es público (lo invoca el navegador del usuario al
 * volver de la pantalla de autorización). Para saber a qué empresa pertenece la
 * conexión sin depender de la sesión, viajamos el `empresa_id` dentro del
 * `state`, firmado con HMAC para que no pueda falsificarse, y con timestamp
 * para que expire.
 */

import crypto from "crypto";

function secret(): string {
  // El Client Secret ya es un secreto del servidor; lo reutilizamos como clave HMAC.
  return process.env.ML_CLIENT_SECRET ?? "dev-secret-no-configurado";
}

/** Genera un state firmado para una empresa. */
export function firmarState(empresaId: string): string {
  const payload = `${empresaId}.${Date.now()}`;
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

/** Verifica un state y devuelve el empresa_id si es válido y no expiró (15 min). */
export function verificarState(state: string): string | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf8");
    const [empresaId, ts, sig] = decoded.split(".");
    if (!empresaId || !ts || !sig) return null;
    const esperado = crypto
      .createHmac("sha256", secret())
      .update(`${empresaId}.${ts}`)
      .digest("hex");
    // Comparación en tiempo constante.
    const a = Buffer.from(sig);
    const b = Buffer.from(esperado);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    if (Date.now() - Number(ts) > 15 * 60 * 1000) return null;
    return empresaId;
  } catch {
    return null;
  }
}

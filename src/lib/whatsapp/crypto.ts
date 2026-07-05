import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Cifrado de tokens de WhatsApp (AES-256-GCM).
 * Formato almacenado: base64(iv).base64(authTag).base64(ciphertext)
 * La clave viene de WHATSAPP_TOKEN_KEY: 32 bytes en base64
 * (generar con: openssl rand -base64 32).
 */

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;

function getKey(): Buffer {
  const b64 = process.env.WHATSAPP_TOKEN_KEY;
  if (!b64) {
    throw new Error("Falta WHATSAPP_TOKEN_KEY en el entorno (32 bytes en base64).");
  }
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new Error("WHATSAPP_TOKEN_KEY inválida: deben ser exactamente 32 bytes en base64.");
  }
  return key;
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

export function decryptToken(stored: string): string {
  const parts = stored.split(".");
  if (parts.length !== 3) throw new Error("Token cifrado con formato inválido.");
  const [iv, tag, data] = parts.map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

import { describe, it, expect, beforeAll } from "vitest";
import { encryptToken, decryptToken } from "./crypto";

beforeAll(() => {
  process.env.WHATSAPP_TOKEN_KEY = "LLaTrgLxEMAOFM8OZDYRSCe+fugcx0AKIeHYO/jpS4g=";
});

describe("crypto (AES-256-GCM)", () => {
  it("round-trip: encryptToken -> decryptToken devuelve el texto original", () => {
    const original = "EAAG_token_de_prueba_super_secreto_123";
    const cifrado = encryptToken(original);
    expect(cifrado).not.toBe(original);
    expect(cifrado.split(".")).toHaveLength(3);
    expect(decryptToken(cifrado)).toBe(original);
  });

  it("dos cifrados del mismo texto son distintos (IV aleatorio)", () => {
    const a = encryptToken("mismo-texto");
    const b = encryptToken("mismo-texto");
    expect(a).not.toBe(b);
  });

  it("falla si falta WHATSAPP_TOKEN_KEY", () => {
    const prev = process.env.WHATSAPP_TOKEN_KEY;
    delete process.env.WHATSAPP_TOKEN_KEY;
    expect(() => encryptToken("x")).toThrow(/WHATSAPP_TOKEN_KEY/);
    process.env.WHATSAPP_TOKEN_KEY = prev;
  });

  it("falla si el token cifrado tiene formato inválido", () => {
    expect(() => decryptToken("no-tiene-el-formato-correcto")).toThrow(/formato inválido/);
  });
});

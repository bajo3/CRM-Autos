import { createHmac } from "crypto";
import { describe, it, expect } from "vitest";
import { verificarSignedRequest } from "./meta-signed-request";

const SECRET = "app-secret-de-prueba";

function base64Url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function firmar(payload: Record<string, unknown>, secret = SECRET): string {
  const payloadB64 = base64Url(JSON.stringify(payload));
  const firma = createHmac("sha256", secret).update(payloadB64).digest();
  return `${base64Url(firma)}.${payloadB64}`;
}

describe("verificarSignedRequest", () => {
  it("acepta un signed_request válido y devuelve el payload", () => {
    const signed = firmar({ algorithm: "HMAC-SHA256", issued_at: 1700000000, user_id: "1234567890" });
    const payload = verificarSignedRequest(signed, SECRET);
    expect(payload).not.toBeNull();
    expect(payload?.user_id).toBe("1234567890");
  });

  it("rechaza si la firma no coincide (secret distinto)", () => {
    const signed = firmar({ algorithm: "HMAC-SHA256", user_id: "1" }, "otro-secret");
    expect(verificarSignedRequest(signed, SECRET)).toBeNull();
  });

  it("rechaza si falta el app secret", () => {
    const signed = firmar({ algorithm: "HMAC-SHA256", user_id: "1" });
    expect(verificarSignedRequest(signed, undefined)).toBeNull();
  });

  it("rechaza formato sin el separador '.'", () => {
    expect(verificarSignedRequest("no-tiene-punto", SECRET)).toBeNull();
  });

  it("rechaza algoritmo distinto de HMAC-SHA256", () => {
    const signed = firmar({ algorithm: "OTRO", user_id: "1" });
    expect(verificarSignedRequest(signed, SECRET)).toBeNull();
  });

  it("rechaza payload manipulado (firma no matchea el nuevo payload)", () => {
    const signed = firmar({ algorithm: "HMAC-SHA256", user_id: "1" });
    const [firma] = signed.split(".");
    const payloadManipulado = base64Url(JSON.stringify({ algorithm: "HMAC-SHA256", user_id: "999" }));
    expect(verificarSignedRequest(`${firma}.${payloadManipulado}`, SECRET)).toBeNull();
  });
});

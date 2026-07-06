import { describe, it, expect } from "vitest";
import {
  telefonoDesdeJid,
  jidDesdeTelefono,
  construirWebhookMensajeTexto,
  textoDeMensajeBaileys,
  firmarPayload,
  traducirPayloadEnvio,
  respuestaEnvioOk,
} from "./meta-format.js";

describe("telefonoDesdeJid / jidDesdeTelefono", () => {
  it("extrae el teléfono de un jid individual", () => {
    expect(telefonoDesdeJid("5492491112233@s.whatsapp.net")).toBe("5492491112233");
  });

  it("quita el sufijo :device si está presente", () => {
    expect(telefonoDesdeJid("5492491112233:12@s.whatsapp.net")).toBe("5492491112233");
  });

  it("arma el jid individual a partir de un teléfono", () => {
    expect(jidDesdeTelefono("5492491112233")).toBe("5492491112233@s.whatsapp.net");
  });
});

describe("construirWebhookMensajeTexto", () => {
  it("arma el shape exacto que espera webhook-parser.ts del CRM", () => {
    const payload = construirWebhookMensajeTexto({
      phoneNumberId: "baileys-empresa-1",
      telefono: "5492491112233",
      nombreContacto: "Carla",
      waMessageId: "3EB0ABC123",
      timestampSegundos: 1783230000,
      texto: "Hola, me interesa la Amarok",
    });

    expect(payload.object).toBe("whatsapp_business_account");
    const value = payload.entry[0].changes[0].value;
    expect(payload.entry[0].changes[0].field).toBe("messages");
    expect(value.metadata.phone_number_id).toBe("baileys-empresa-1");
    expect(value.contacts[0]).toEqual({ profile: { name: "Carla" }, wa_id: "5492491112233" });
    expect(value.messages[0]).toMatchObject({
      from: "5492491112233",
      id: "3EB0ABC123",
      timestamp: "1783230000",
      type: "text",
      text: { body: "Hola, me interesa la Amarok" },
    });
  });

  it("usa el teléfono como nombre de contacto si no hay pushName", () => {
    const payload = construirWebhookMensajeTexto({
      phoneNumberId: "baileys-empresa-1",
      telefono: "5492491112233",
      nombreContacto: null,
      waMessageId: "3EB0ABC123",
      timestampSegundos: 1783230000,
      texto: "hola",
    });
    expect(payload.entry[0].changes[0].value.contacts[0].profile.name).toBe("5492491112233");
  });
});

describe("textoDeMensajeBaileys", () => {
  it("extrae de conversation", () => {
    expect(textoDeMensajeBaileys({ message: { conversation: "hola" } })).toBe("hola");
  });

  it("extrae de extendedTextMessage.text", () => {
    expect(textoDeMensajeBaileys({ message: { extendedTextMessage: { text: "hola largo" } } })).toBe("hola largo");
  });

  it("devuelve null si no hay texto (p.ej. imagen)", () => {
    expect(textoDeMensajeBaileys({ message: { imageMessage: { caption: "foto" } } })).toBeNull();
  });

  it("devuelve null si no hay mensaje", () => {
    expect(textoDeMensajeBaileys({})).toBeNull();
  });
});

describe("firmarPayload", () => {
  it("genera una firma sha256=<hex> estable para el mismo secret y body", () => {
    const firma1 = firmarPayload('{"a":1}', "secreto");
    const firma2 = firmarPayload('{"a":1}', "secreto");
    expect(firma1).toBe(firma2);
    expect(firma1).toMatch(/^sha256=[0-9a-f]{64}$/);
  });

  it("cambia si cambia el secret", () => {
    const firma1 = firmarPayload('{"a":1}', "secreto1");
    const firma2 = firmarPayload('{"a":1}', "secreto2");
    expect(firma1).not.toBe(firma2);
  });
});

describe("traducirPayloadEnvio", () => {
  it("traduce un payload de texto válido al jid + contenido de Baileys", () => {
    const r = traducirPayloadEnvio({
      messaging_product: "whatsapp",
      to: "5492491112233",
      type: "text",
      text: { body: "Hola" },
    });
    expect(r).toEqual({ ok: true, jid: "5492491112233@s.whatsapp.net", contenido: { text: "Hola" } });
  });

  it("rechaza si messaging_product no es whatsapp", () => {
    const r = traducirPayloadEnvio({ messaging_product: "otro", to: "1", type: "text", text: { body: "x" } });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(400);
  });

  it("rechaza si falta 'to'", () => {
    const r = traducirPayloadEnvio({ messaging_product: "whatsapp", type: "text", text: { body: "x" } });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(400);
  });

  it("rechaza type distinto de text con mensaje estilo error de Graph", () => {
    const r = traducirPayloadEnvio({ messaging_product: "whatsapp", to: "1", type: "template", template: {} });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(400);
    expect(r.error.message).toMatch(/no soporta/);
    expect(r.error.code).toBe(131009);
  });

  it("rechaza si falta text.body", () => {
    const r = traducirPayloadEnvio({ messaging_product: "whatsapp", to: "1", type: "text" });
    expect(r.ok).toBe(false);
  });

  it("rechaza un body no-objeto", () => {
    const r = traducirPayloadEnvio(null);
    expect(r.ok).toBe(false);
    expect(r.status).toBe(400);
  });
});

describe("respuestaEnvioOk", () => {
  it("arma la respuesta formato Graph API", () => {
    expect(respuestaEnvioOk("wamid.ABC")).toEqual({
      messaging_product: "whatsapp",
      messages: [{ id: "wamid.ABC" }],
    });
  });
});

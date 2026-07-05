import { describe, it, expect } from "vitest";
import { parseWebhookPayload } from "./webhook-parser";

const FIXTURE_MENSAJE = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba-test-001",
      changes: [
        {
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "5492494000000", phone_number_id: "109876543210001" },
            contacts: [{ profile: { name: "Carla Fixture" }, wa_id: "5492491112233" }],
            messages: [
              {
                from: "5492491112233",
                id: "wamid.TESTFIXTURE001",
                timestamp: "1783230000",
                text: { body: "Hola, me interesa la Amarok" },
                type: "text",
              },
            ],
          },
          field: "messages",
        },
      ],
    },
  ],
};

const FIXTURE_STATUS = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba-test-001",
      changes: [
        {
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "5492494000000", phone_number_id: "109876543210001" },
            statuses: [
              { id: "wamid.TESTOUT001", status: "delivered", timestamp: "1783230100", recipient_id: "5492491112233" },
            ],
          },
          field: "messages",
        },
      ],
    },
  ],
};

describe("parseWebhookPayload", () => {
  it("extrae un mensaje entrante de texto con su contacto", () => {
    const { mensajes, estados } = parseWebhookPayload(FIXTURE_MENSAJE);
    expect(estados).toHaveLength(0);
    expect(mensajes).toHaveLength(1);
    expect(mensajes[0]).toMatchObject({
      phoneNumberId: "109876543210001",
      waMessageId: "wamid.TESTFIXTURE001",
      telefono: "5492491112233",
      nombreContacto: "Carla Fixture",
      tipo: "texto",
      cuerpo: "Hola, me interesa la Amarok",
    });
  });

  it("extrae una actualización de estado de un mensaje saliente", () => {
    const { mensajes, estados } = parseWebhookPayload(FIXTURE_STATUS);
    expect(mensajes).toHaveLength(0);
    expect(estados).toHaveLength(1);
    expect(estados[0]).toMatchObject({
      waMessageId: "wamid.TESTOUT001",
      estado: "entregado",
    });
  });

  it("ignora un payload sin entry/changes sin explotar", () => {
    expect(parseWebhookPayload({})).toEqual({ mensajes: [], estados: [] });
  });

  it("ignora un change cuyo field no es 'messages'", () => {
    const otro = { entry: [{ changes: [{ field: "otro_campo", value: {} }] }] };
    expect(parseWebhookPayload(otro)).toEqual({ mensajes: [], estados: [] });
  });
});

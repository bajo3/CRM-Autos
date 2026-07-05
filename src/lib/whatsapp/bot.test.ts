import { describe, it, expect } from "vitest";
import { chequeoHandoffPrevio } from "./bot";
import { detectarVehiculo } from "./inbound";

type Config = Parameters<typeof chequeoHandoffPrevio>[1];

function config(overrides: Partial<Config> = {}): Config {
  return {
    keywords_handoff: ["humano", "asesor", "vendedor", "persona"],
    ...overrides,
  } as Config;
}

describe("chequeoHandoffPrevio (decisión de handoff)", () => {
  it("no deriva ante un mensaje normal", () => {
    expect(chequeoHandoffPrevio("Hola, que autos tienen?", config())).toEqual({ handoff: false });
  });

  it("deriva si aparece una palabra clave configurada", () => {
    const r = chequeoHandoffPrevio("quiero hablar con un humano", config());
    expect(r.handoff).toBe(true);
    expect(r.motivo).toBe("palabra_clave");
  });

  it("deriva ante enojo o reclamo", () => {
    const r = chequeoHandoffPrevio("esto es una estafa, pesimo servicio", config());
    expect(r.handoff).toBe(true);
    expect(r.motivo).toBe("enojo_reclamo");
  });

  it("deriva ante negociación de precio", () => {
    const r = chequeoHandoffPrevio("me hacen un descuento en la amarok?", config());
    expect(r.handoff).toBe(true);
    expect(r.motivo).toBe("negociacion_precio");
  });

  it("deriva ante intención fuerte de compra", () => {
    const r = chequeoHandoffPrevio("quiero comprarlo, como pago?", config());
    expect(r.handoff).toBe(true);
    expect(r.motivo).toBe("intencion_compra");
  });

  it("respeta palabras clave personalizadas de la agencia", () => {
    const r = chequeoHandoffPrevio("necesito ayuda urgente", config({ keywords_handoff: ["ayuda urgente"] }));
    expect(r.handoff).toBe(true);
    expect(r.motivo).toBe("palabra_clave");
  });
});

describe("detectarVehiculo", () => {
  const stock = [
    { id: "v1", marca: "Volkswagen", modelo: "Amarok" },
    { id: "v2", marca: "Toyota", modelo: "Corolla" },
  ];

  it("detecta marca + modelo mencionados juntos", () => {
    expect(detectarVehiculo("Hola, la Volkswagen Amarok sigue disponible?", stock)?.id).toBe("v1");
  });

  it("detecta el modelo solo (score >= 3)", () => {
    expect(detectarVehiculo("me interesa la Amarok", stock)?.id).toBe("v1");
  });

  it("no detecta nada solo con la marca (evita falsos positivos)", () => {
    expect(detectarVehiculo("tienen algo de Volkswagen?", stock)).toBeNull();
  });

  it("no detecta nada si no hay coincidencia", () => {
    expect(detectarVehiculo("hola buenas tardes", stock)).toBeNull();
  });
});

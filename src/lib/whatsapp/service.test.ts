import { describe, it, expect } from "vitest";
import { dentroVentana24h, botEfectivo, renderPlantilla, validarVariablesPlantilla, preview } from "./service";

describe("dentroVentana24h", () => {
  const ahora = new Date("2026-07-05T12:00:00Z");

  it("es false si nunca entró un mensaje (null)", () => {
    expect(dentroVentana24h(null, ahora)).toBe(false);
  });

  it("es true justo antes de las 24 h", () => {
    const hace23h = new Date(ahora.getTime() - 23 * 60 * 60 * 1000).toISOString();
    expect(dentroVentana24h(hace23h, ahora)).toBe(true);
  });

  it("es false justo después de las 24 h", () => {
    const hace25h = new Date(ahora.getTime() - 25 * 60 * 60 * 1000).toISOString();
    expect(dentroVentana24h(hace25h, ahora)).toBe(false);
  });
});

describe("botEfectivo", () => {
  const ahora = new Date("2026-07-05T12:00:00Z");

  it("false si el flag global está apagado", () => {
    expect(botEfectivo(false, null, ahora)).toBe(false);
  });

  it("true si está activo y sin pausa", () => {
    expect(botEfectivo(true, null, ahora)).toBe(true);
  });

  it("false si está pausado hasta el futuro", () => {
    const futuro = new Date(ahora.getTime() + 60_000).toISOString();
    expect(botEfectivo(true, futuro, ahora)).toBe(false);
  });

  it("true si la pausa ya venció", () => {
    const pasado = new Date(ahora.getTime() - 60_000).toISOString();
    expect(botEfectivo(true, pasado, ahora)).toBe(true);
  });
});

describe("renderPlantilla", () => {
  it("reemplaza variables posicionales en orden", () => {
    expect(renderPlantilla("Hola {{1}}, tu {{2}} te espera", ["Carla", "Amarok"])).toBe(
      "Hola Carla, tu Amarok te espera",
    );
  });

  it("deja el placeholder literal si falta la variable", () => {
    expect(renderPlantilla("Hola {{1}} y {{2}}", ["Carla"])).toBe("Hola Carla y {{2}}");
  });
});

describe("validarVariablesPlantilla", () => {
  it("acepta un cuerpo sin variables", () => {
    expect(validarVariablesPlantilla("Hola, gracias por escribir.")).toEqual({ ok: true, cantidad: 0 });
  });

  it("acepta variables secuenciales desde 1", () => {
    expect(validarVariablesPlantilla("Hola {{1}}, tu {{2}} está lista")).toEqual({ ok: true, cantidad: 2 });
  });

  it("rechaza si hay un salto en la secuencia", () => {
    const r = validarVariablesPlantilla("Hola {{1}}, tu auto {{3}} está lista");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/\{\{2\}\}/);
  });

  it("no le importa el orden de aparición mientras estén todas", () => {
    expect(validarVariablesPlantilla("{{2}} después de {{1}}")).toEqual({ ok: true, cantidad: 2 });
  });
});

describe("preview", () => {
  it("devuelve null para texto vacío", () => {
    expect(preview(null)).toBeNull();
    expect(preview("")).toBeNull();
  });

  it("trunca textos largos con elipsis", () => {
    const largo = "a".repeat(100);
    const resultado = preview(largo);
    expect(resultado!.length).toBeLessThan(100);
    expect(resultado!.endsWith("…")).toBe(true);
  });
});

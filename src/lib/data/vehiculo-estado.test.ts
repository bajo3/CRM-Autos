import { describe, expect, it } from "vitest";
import { estaDisponible, estadoOperativo } from "./vehiculo-estado";

describe("estado operativo del vehículo", () => {
  it("trata los estados legacy de publicación como disponible", () => {
    expect(estadoOperativo("publicado")).toBe("disponible");
    expect(estadoOperativo("pausado")).toBe("disponible");
    expect(estaDisponible("no_publicado")).toBe(true);
  });

  it("preserva los estados comerciales reales", () => {
    expect(estadoOperativo("reservado")).toBe("reservado");
    expect(estaDisponible("vendido")).toBe(false);
  });
});
